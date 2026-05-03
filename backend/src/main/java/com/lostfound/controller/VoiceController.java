package com.lostfound.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lostfound.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.Map;

@RestController
@RequestMapping("/api/voice")
public class VoiceController {

    @Autowired
    private GeminiService geminiService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/parse")
    public ResponseEntity<?> parseVoiceText(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No text provided"));
        }

        try {
            System.out.println("VOICE_AI -> Forwarding request to Gemini API");
            String jsonResult = geminiService.parseVoice(text);
            
            // Parse the JSON string from Gemini back to a Map to return as JSON
            Map<String, Object> resultMap = objectMapper.readValue(jsonResult, Map.class);
            return ResponseEntity.ok(resultMap);

        } catch (Exception e) {
            System.err.println("VOICE_AI_ERROR: " + e.getMessage());
            String errorMsg = e.getMessage();
            String suggestion = "Check your Gemini API Key and internet connection.";
            
            if (errorMsg != null && errorMsg.contains("404")) {
                suggestion = "AI Model not found. Please ensure you are using a valid Gemini model name.";
            } else if (errorMsg != null && errorMsg.contains("401")) {
                suggestion = "Invalid API Key. Please check your GEMINI_API_KEY environment variable.";
            } else if (errorMsg != null && errorMsg.contains("429")) {
                suggestion = "API Rate limit exceeded. Please wait for a minute or try later after 60 seconds.";
            }

            return ResponseEntity.status(500).body(Map.of(
                "error", "AI Service Connection Failed",
                "details", errorMsg != null ? errorMsg : "Unknown error",
                "suggestion", suggestion
            ));
        }
    }

    @PostMapping("/verify-image")
    public ResponseEntity<?> verifyImage(@RequestParam("image") MultipartFile image) {
        File tempFile = null;
        try {
            tempFile = File.createTempFile("verify-", ".jpg");
            image.transferTo(tempFile);

            String jsonResult = geminiService.verifyImage(tempFile);
            Map<String, Object> resultMap = objectMapper.readValue(jsonResult, Map.class);
            return ResponseEntity.ok(resultMap);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Image verification service offline: " + e.getMessage()));
        } finally {
            if (tempFile != null && tempFile.exists()) {
                tempFile.delete();
            }
        }
    }
}

