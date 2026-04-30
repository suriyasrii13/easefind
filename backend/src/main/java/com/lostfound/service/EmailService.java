package com.lostfound.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    // Injected directly — no reflection, no proxy issues
    @Autowired(required = false)
    private JavaMailSender mailSender;

    // Must match spring.mail.username in application.properties
    @Value("${spring.mail.username:suriyasricse@gmail.com}")
    private String fromEmail;

    // ── Match Alert ─────────────────────────────────────────────────────────
    @Async
    public void sendMatchAlert(String toEmail, String userName, String itemName, String securityKey) {
        if (mailSender == null) {
            System.out.println("EMAIL SKIP: JavaMailSender not available. Would have sent to: " + toEmail);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);           // ✅ Must match Gmail auth account
            msg.setTo(toEmail);
            msg.setSubject("🎯 Match Found for Your Item — EaseFind.AI");
            msg.setText(
                "Hello " + userName + ",\n\n" +
                "Great news! Our AI Engine has found a strong potential match for your item: \"" + itemName + "\".\n\n" +
                "🔑 Security Key: " + (securityKey != null ? securityKey : "N/A") + "\n\n" +
                "Log in to your dashboard to view the match and use the key above to verify ownership.\n\n" +
                "→ https://frontend-navy-seven-51.vercel.app/dashboard/match-results\n\n" +
                "Best regards,\n" +
                "The EaseFind.AI Team"
            );
            mailSender.send(msg);
            System.out.println("✅ EMAIL SENT to " + toEmail + " for item: " + itemName);
        } catch (Exception e) {
            System.err.println("❌ EMAIL FAILED to " + toEmail + ": " + e.getMessage());
        }
    }

    // ── Chat Request Alert ───────────────────────────────────────────────────
    @Async
    public void sendChatRequestAlert(String toEmail, String senderName, String itemName, String securityKey) {
        if (mailSender == null) {
            System.out.println("EMAIL SKIP: JavaMailSender not available for chat alert to: " + toEmail);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);           // ✅ Must match Gmail auth account
            msg.setTo(toEmail);
            msg.setSubject("💬 Someone Wants to Chat — EaseFind.AI");
            msg.setText(
                "Hello,\n\n" +
                senderName + " has a matching item and wants to start a secure chat about: \"" + itemName + "\".\n\n" +
                "🔑 Security Key: " + (securityKey != null ? securityKey : "N/A") + "\n\n" +
                "Log in to your dashboard to reply using the key above.\n\n" +
                "→ https://frontend-navy-seven-51.vercel.app/dashboard/match-results\n\n" +
                "Best regards,\n" +
                "The EaseFind.AI Team"
            );
            mailSender.send(msg);
            System.out.println("✅ CHAT EMAIL SENT to " + toEmail);
        } catch (Exception e) {
            System.err.println("❌ CHAT EMAIL FAILED to " + toEmail + ": " + e.getMessage());
        }
    }
}
