package com.lostfound.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    private final WebClient webClient;
    private final String apiKey;
    private final String fromEmail = "easyfind.ai@gmail.com";

    public EmailService(@Value("${BREVO_API_KEY:}") String apiKey) {
        this.webClient = WebClient.builder().build();
        this.apiKey = apiKey != null ? apiKey.trim() : "";
    }

    private void sendBrevoEmail(String toEmail, String subject, String textContent) {
        if (apiKey.isEmpty()) {
            System.err.println("EMAIL SKIP: BREVO_API_KEY is not set. Would have sent to: " + toEmail);
            return;
        }

        Map<String, Object> requestBody = Map.of(
            "sender", Map.of("name", "EaseFind.AI", "email", fromEmail),
            "to", List.of(Map.of("email", toEmail)),
            "subject", subject,
            "textContent", textContent
        );

        try {
            webClient.post()
                .uri("https://api.brevo.com/v3/smtp/email")
                .header("api-key", apiKey)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(requestBody)
                .retrieve()
                .onStatus(status -> status.isError(), response -> 
                    response.bodyToMono(String.class).flatMap(error -> {
                        System.err.println("BREVO API ERROR: " + error);
                        return Mono.error(new RuntimeException(error));
                    })
                )
                .bodyToMono(String.class)
                .block();
            System.out.println("✅ EMAIL SENT via Brevo HTTP API to " + toEmail);
        } catch (Exception e) {
            System.err.println("❌ EMAIL FAILED to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendMatchAlert(String toEmail, String userName, String itemName, String securityKey) {
        String subject = "🎯 Match Found for Your Item — EaseFind.AI";
        String text = "Hello " + userName + ",\n\n" +
            "Great news! Our AI Engine has found a strong potential match for your item: \"" + itemName + "\".\n\n" +
            "🔑 Security Key: " + (securityKey != null ? securityKey : "N/A") + "\n\n" +
            "Log in to your dashboard to view the match and use the key above to verify ownership.\n\n" +
            "→ https://frontend-navy-seven-51.vercel.app/dashboard/match-results\n\n" +
            "Best regards,\n" +
            "The EaseFind.AI Team";
        sendBrevoEmail(toEmail, subject, text);
    }

    @Async
    public void sendChatRequestAlert(String toEmail, String senderName, String itemName, String securityKey) {
        String subject = "💬 Someone Wants to Chat — EaseFind.AI";
        String text = "Hello,\n\n" +
            senderName + " has a matching item and wants to start a secure chat about: \"" + itemName + "\".\n\n" +
            "🔑 Security Key: " + (securityKey != null ? securityKey : "N/A") + "\n\n" +
            "Log in to your dashboard to reply using the key above.\n\n" +
            "→ https://frontend-navy-seven-51.vercel.app/dashboard/match-results\n\n" +
            "Best regards,\n" +
            "The EaseFind.AI Team";
        sendBrevoEmail(toEmail, subject, text);
    }

    @Async
    public void sendReportConfirmation(String toEmail, String userName, String itemName, String type) {
        String subject = "📋 Item Report Received — EaseFind.AI";
        String text = "Hello " + userName + ",\n\n" +
            "This is a confirmation that we have successfully received your " + type + " item report for: \"" + itemName + "\".\n\n" +
            "Our AI Engine is now scanning the database for potential matches. You will receive another email if a match is found.\n\n" +
            "Log in to your dashboard to track the status of your report.\n\n" +
            "→ https://frontend-navy-seven-51.vercel.app/dashboard/history\n\n" +
            "Best regards,\n" +
            "The EaseFind.AI Team";
        sendBrevoEmail(toEmail, subject, text);
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String userName) {
        String subject = "👋 Welcome to EaseFind.AI — Let's Find Your Items!";
        String text = "Hello " + userName + ",\n\n" +
            "Welcome to EaseFind.AI, the smartest way to recover lost items on campus.\n\n" +
            "You can now report lost items, browse found items, and use our AI Assistant to help you through the process.\n\n" +
            "Get started here:\n" +
            "→ https://frontend-navy-seven-51.vercel.app/login\n\n" +
            "Best regards,\n" +
            "The EaseFind.AI Team";
        sendBrevoEmail(toEmail, subject, text);
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String token) {
        String subject = "🔐 Password Reset Request — EaseFind.AI";
        String resetUrl = "https://frontend-navy-seven-51.vercel.app/reset-password?token=" + token;
        String text = "Hello,\n\n" +
            "You requested a password reset for your EaseFind.AI account.\n\n" +
            "Please click the link below to set a new password. This link will expire in 1 hour.\n\n" +
            "→ " + resetUrl + "\n\n" +
            "If you did not request this, you can safely ignore this email.\n\n" +
            "Best regards,\n" +
            "The EaseFind.AI Team";
        sendBrevoEmail(toEmail, subject, text);
    }
}
