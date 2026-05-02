package com.lostfound.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.io.File;
import java.nio.file.Files;
import java.util.*;

@Service
public class GeminiService {

    private static final String DEFAULT_MODEL = "gemini-1.5-flash";
    private static final String FALLBACK_MODEL = "gemini-pro";
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public GeminiService(@Value("${gemini.api.key:}") String apiKey) {
        this.webClient = WebClient.builder().build(); // No baseUrl, we will use absolute URLs
        this.objectMapper = new ObjectMapper();
        this.apiKey = apiKey != null ? apiKey.trim() : null;
    }







    private String callGemini(String model, Map<String, Object> requestBody) {
        if (apiKey == null || apiKey.isEmpty()) {
            System.err.println("GEMINI_ERROR: API Key is missing or empty!");
            throw new RuntimeException("Gemini API key is not configured.");
        }

        try {
            return executeCall(model, requestBody);
        } catch (Exception e) {
            System.err.println("GEMINI_API -> " + model + " failed (" + e.getMessage() + "), trying fallback " + FALLBACK_MODEL + "...");
            try {
                return executeCall(FALLBACK_MODEL, requestBody);
            } catch (Exception e2) {
                System.err.println("GEMINI_API_FATAL: Both models failed. Reason: " + e2.getMessage());
                throw new RuntimeException("Gemini API failed: " + e2.getMessage());
            }
        }
    }

    private String executeCall(String model, Map<String, Object> requestBody) throws Exception {
        System.out.println("GEMINI_API -> Requesting model: " + model);
        // Using v1beta which is required for gemini-1.5-flash
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
        
        try {
            String responseStr = webClient.post()
                    .uri(url)
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .bodyValue(requestBody)
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse -> 
                        clientResponse.bodyToMono(String.class).flatMap(errorBody -> {
                            System.err.println("GEMINI_API_ERROR_BODY: " + errorBody);
                            return Mono.error(new RuntimeException(errorBody));
                        })
                    )
                    .bodyToMono(String.class)
                    .block();

            JsonNode root = objectMapper.readTree(responseStr);
            JsonNode candidates = root.path("candidates");
            if (candidates.isMissingNode() || candidates.isEmpty()) {
                throw new RuntimeException("No candidates. Response: " + responseStr);
            }

            String rawText = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
            
            if (rawText.contains("{") && rawText.contains("}")) {
                return rawText.substring(rawText.indexOf("{"), rawText.lastIndexOf("}") + 1);
            }
            return rawText;
        } catch (Exception e) {
            // If we hit 429, wait 1 second before the fallback in callGemini
            if (e.getMessage().contains("429")) {
                Thread.sleep(1000); 
            }
            throw e;
        }
    }



    private Map<String, Object> createTextRequest(String systemPrompt, String userText) {
        Map<String, Object> request = new HashMap<>();
        
        // Merge system prompt into user text for maximum compatibility with v1
        String combinedText = (systemPrompt != null ? systemPrompt + "\n\nUser Input: " : "") + userText;

        Map<String, Object> content = new HashMap<>();
        content.put("role", "user");
        Map<String, Object> part = new HashMap<>();
        part.put("text", combinedText);
        content.put("parts", List.of(part));

        request.put("contents", List.of(content));
        return request;
    }


    public String askChatBot(String query) {
        String systemPrompt = "You are a helpful AI assistant for the 'EaseFind' Smart Lost & Found system. " +
                "Help users report lost or found items, explain how AI matching works, and guide them on claiming items. " +
                "Keep responses concise, friendly, and formatted nicely.";
        return callGemini(DEFAULT_MODEL, createTextRequest(systemPrompt, query));
    }

    public String parseVoice(String transcript) {
        String systemPrompt = "You are an entity extractor for a lost and found system. Extract the following from the transcript:\n" +
                "- itemName (string, capitalize, e.g., 'IPhone 13')\n" +
                "- category (must be exactly one of: Electronics, Personal Items, Documents, Accessories, Clothing, Keys, Bags, Jewelry, Other)\n" +
                "- location (typical campus location like Classroom, Library, Canteen, etc.)\n" +
                "- itemType (either 'lost' or 'found')\n" +
                "- date (extract if mentioned, e.g., 'today', 'yesterday', or a specific date. Format as YYYY-MM-DD. Use today's date " + java.time.LocalDate.now().toString() + " if relative terms like 'today' are used. If no date mentioned, omit this key.)\n" +
                "Return ONLY a raw JSON object with keys: itemName, category, description (original transcript), location, itemType, date. Do not wrap in markdown tags.";
        
        return callGemini(DEFAULT_MODEL, createTextRequest(systemPrompt, transcript));
    }


    public String moderateChat(String lostDesc, String foundDesc) {
        String systemPrompt = "You are the EaseFind Security Bot. You analyze a lost item description and a found item description to find 1-3 common key visual traits (like color, brand, specific marks) that a scammer wouldn't know unless they actually have the item. " +
                "Return a short message starting with 'I am the EaseFind Security Bot 🤖'. Advise the owner to ask the finder about a specific hidden detail related to these common traits before meeting in person. " +
                "If no strong common traits exist, give a generic security warning to verify details.";
        
        String userText = "Lost Item: " + lostDesc + "\nFound Item: " + foundDesc;
        return callGemini(DEFAULT_MODEL, createTextRequest(systemPrompt, userText));
    }

    public String evaluateMatch(File lostImage, File foundImage, String lostDesc, String foundDesc) {
        Map<String, Object> request = new HashMap<>();
        
        // System instruction
        String sysPrompt = "You are an AI matching engine for a lost and found system. " +
                "Compare the lost item details (and image if provided) against the found item details (and image). " +
                "Return ONLY a raw JSON object with keys: image_score (0.0 to 1.0, 0 if no images), text_score (0.0 to 1.0), final_score (0.0 to 1.0), and status ('High Confidence', 'Potential Match', or 'Low Confidence'). Do not wrap in markdown tags.";
        
        Map<String, Object> sysInstr = new HashMap<>();
        sysInstr.put("parts", List.of(Map.of("text", sysPrompt)));
        request.put("systemInstruction", sysInstr);

        // Contents
        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", "Lost Item Description: " + lostDesc + "\nFound Item Description: " + foundDesc));

        try {
            if (lostImage != null && lostImage.exists()) {
                byte[] bytes = Files.readAllBytes(lostImage.toPath());
                String base64 = Base64.getEncoder().encodeToString(bytes);
                Map<String, Object> imgData = new HashMap<>();
                imgData.put("mimeType", "image/jpeg"); // simplified
                imgData.put("data", base64);
                parts.add(Map.of("inlineData", imgData));
            }

            if (foundImage != null && foundImage.exists()) {
                byte[] bytes = Files.readAllBytes(foundImage.toPath());
                String base64 = Base64.getEncoder().encodeToString(bytes);
                Map<String, Object> imgData = new HashMap<>();
                imgData.put("mimeType", "image/jpeg");
                imgData.put("data", base64);
                parts.add(Map.of("inlineData", imgData));
            }
        } catch (Exception e) {
            System.err.println("Error encoding images for Gemini: " + e.getMessage());
        }

        Map<String, Object> content = new HashMap<>();
        content.put("role", "user");
        content.put("parts", parts);
        request.put("contents", List.of(content));

        String jsonResult = callGemini(DEFAULT_MODEL, request);
        return jsonResult.replaceAll("```json", "").replaceAll("```", "").trim();
    }

    public String verifyImage(File imageFile) {
        Map<String, Object> request = new HashMap<>();
        
        String sysPrompt = "You are an image authenticity verifier. Analyze the provided image. Determine if it is a real-world photo taken by a user, or a digital/stock illustration. Return ONLY a JSON object with: is_authentic (boolean), score (0-100 integer), and reasons (array of strings explaining why).";
        
        Map<String, Object> sysInstr = new HashMap<>();
        sysInstr.put("parts", List.of(Map.of("text", sysPrompt)));
        request.put("systemInstruction", sysInstr);

        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", "Please analyze this image."));

        try {
            if (imageFile != null && imageFile.exists()) {
                byte[] bytes = Files.readAllBytes(imageFile.toPath());
                String base64 = Base64.getEncoder().encodeToString(bytes);
                Map<String, Object> imgData = new HashMap<>();
                imgData.put("mimeType", "image/jpeg");
                imgData.put("data", base64);
                parts.add(Map.of("inlineData", imgData));
            }
        } catch (Exception e) {
            System.err.println("Error encoding image for Gemini: " + e.getMessage());
        }

        Map<String, Object> content = new HashMap<>();
        content.put("role", "user");
        content.put("parts", parts);
        request.put("contents", List.of(content));

        String jsonResult = callGemini(DEFAULT_MODEL, request);
        return jsonResult.replaceAll("```json", "").replaceAll("```", "").trim();
    }
}

