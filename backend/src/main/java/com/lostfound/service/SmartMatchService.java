package com.lostfound.service;

import java.io.File;
import java.util.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.lostfound.entity.*;
import com.lostfound.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SmartMatchService {

    @Autowired
    private LostItemRepository lostRepo;

    @Autowired
    private FoundItemRepository foundRepo;

    @Autowired
    private MatchRepository matchRepo;

    @Autowired
    private NotificationRepository notificationRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private AIService aiService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;


    private final String UPLOAD_DIR = "uploads/";

    public List<Match> findMatches() {
        List<LostItem> lostItems = lostRepo.findByStatus("PENDING");
        List<FoundItem> foundItems = foundRepo.findByStatus("PENDING");

        for (LostItem lost : lostItems) {
            for (FoundItem found : foundItems) {
                performMatchingLogic(lost, found);
            }
        }
        return matchRepo.findAll();
    }

    public List<Match> getMatchesForUser(Long userId) {
        return matchRepo.findByLostItemUserUserIdOrFoundItemFinderUserId(userId, userId);
    }
    
    public void processNewFoundItem(FoundItem found) {
        System.out.println("AI BROADCAST: New FOUND item reported - scanning all lost reports...");
        
        Notification globalAlert = new Notification();
        globalAlert.setRecipientId(0L); 
        globalAlert.setType("GLOBAL");
        globalAlert.setTitle("Public Notice: New Item Found!");
        globalAlert.setMessage("Someone just reported finding a '" + found.getItemName() + "' at '" + found.getLocation() + "'.");
        globalAlert.setActionText("View Items");
        globalAlert.setActionUrl("/dashboard/found-items");
        notificationRepo.save(globalAlert);
        messagingTemplate.convertAndSend("/topic/global", globalAlert);

        List<LostItem> lostItems = lostRepo.findAll();
        for (LostItem lost : lostItems) {
            performMatchingLogic(lost, found);
        }
    }

    public void processNewLostItem(LostItem lost) {
        System.out.println("AI BROADCAST: New LOST item reported - scanning all found items...");
        List<FoundItem> foundItems = foundRepo.findAll();
        for (FoundItem found : foundItems) {
            performMatchingLogic(lost, found);
        }
    }

    private void performMatchingLogic(LostItem lost, FoundItem found) {
        // --- NULL CHECKS ---
        if (lost == null || found == null) return;
        if (lost.getUser() == null || found.getFinder() == null) {
            System.err.println("AI: Skipping match check - one of the items has a null owner/finder.");
            return;
        }
        // Allow same-user matches (useful for admins and testing)
        // Users can still distinguish their own items in the UI
        
        if (lost.getItemName() == null || found.getItemName() == null) {
            System.err.println("AI: Skipping match check - one of the items has a null name.");
            return;
        }

        double confidenceScore = 0.0;
        boolean isMatch = false;
        String combinedReason = "AI Analysis";

        String lostName = lost.getItemName().toLowerCase().trim();
        String foundName = found.getItemName().toLowerCase().trim();
        
        // Calculate dynamic name similarity for baseline
        double nameSimilarity = calculateSimilarity(lostName, foundName);
        
        try {
            File lostImage = (lost.getImagePath() != null) ? new File(UPLOAD_DIR + lost.getImagePath()) : null;
            File foundImage = (found.getImagePath() != null) ? new File(UPLOAD_DIR + found.getImagePath()) : null;

            // 🐌 ARTIFICIAL DELAY: Wait 4.5 seconds to bypass the 15 Requests/Min Free Tier limit
            try {
                Thread.sleep(4500);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }

            String jsonResponse = aiService.callAI(
                lostImage, 
                foundImage, 
                lost.getDescription() != null ? lost.getDescription() : lost.getItemName(), 
                found.getDescription() != null ? found.getDescription() : found.getItemName()
            );

            JsonNode root = objectMapper.readTree(jsonResponse);
            if (root.has("final_score")) {
                confidenceScore = root.get("final_score").asDouble();
                double textScore = root.path("text_score").asDouble();
                double imageScore = root.path("image_score").asDouble();
                
                List<String> reasons = new ArrayList<>();
                if (imageScore > 0.65) reasons.add("AI visual similarity");
                if (textScore > 0.65) reasons.add("Matching descriptions");
                if (nameSimilarity > 0.8) reasons.add("Strong name match");
                
                combinedReason = reasons.isEmpty() ? "AI comparison" : String.join(", ", reasons);

                // 🚀 FINAL ACCURACY BOOST: 0.75 (75%)
                if (confidenceScore >= 0.75 || textScore > 0.9 || nameSimilarity > 0.95) {
                    isMatch = true;
                    // Boost confidence if names match perfectly
                    if (lostName.equals(foundName)) {
                        confidenceScore = Math.max(confidenceScore, 0.95);
                    }
                }
            }
        } catch (Exception e) {
            // Fallback to purely name-based similarity if AI is offline
            if (nameSimilarity > 0.7) {
                isMatch = true;
                confidenceScore = nameSimilarity;
                combinedReason = "Textual similarity match";
            }
        }

        if (isMatch) {
            saveMatchAndNotify(lost, found, confidenceScore, combinedReason);
        }
    }

    private double calculateSimilarity(String s1, String s2) {
        if (s1.equals(s2)) return 1.0;
        if (s1.contains(s2) || s2.contains(s1)) {
            return (double) Math.min(s1.length(), s2.length()) / Math.max(s1.length(), s2.length()) * 0.9;
        }
        return 0.0; // Simplify for now, could use Levenshtein
    }

    private void saveMatchAndNotify(LostItem lost, FoundItem found, double confidence, String reason) {
        if (matchRepo.existsByLostItemAndFoundItem(lost, found)) {
            System.out.println("MATCH SKIP: Already exists for [" + lost.getItemName() + "] <-> [" + found.getItemName() + "]");
            return;
        }

        Match match = new Match();
        match.setLostItem(lost);
        match.setFoundItem(found);
        match.setStatus("PENDING");
        match.setConfidenceScore(confidence);
        match.setMatchReason(reason);
        
        String securityKey = (lost.getUniqueIdentifier() != null && !lost.getUniqueIdentifier().trim().isEmpty()) 
                ? lost.getUniqueIdentifier() : found.getUniqueIdentifier();
        if (securityKey == null || securityKey.trim().isEmpty()) {
            securityKey = java.util.UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }
        match.setSecurityKey(securityKey);
        match = matchRepo.save(match);

        System.out.println("✅ MATCH SAVED: ID=" + match.getMatchId() + " [" + lost.getItemName() + "] <-> [" + found.getItemName() + "] confidence=" + confidence);

        // Notify both parties
        Long lostUserId  = lost.getUser().getUserId();
        Long foundUserId = found.getFinder().getUserId();
        String lostEmail  = lost.getUser().getEmail();
        String foundEmail = found.getFinder().getEmail();

        notifyUser(lostUserId,  match.getMatchId(), "We found an item that might be your lost " + lost.getItemName() + "! Check your email for the security key.");
        notifyUser(foundUserId, match.getMatchId(), "Your found item '" + found.getItemName() + "' matches a lost report! Check your email for the security key.");

        // Send emails
        try {
            System.out.println("📧 Sending match email to lost-owner: " + lostEmail);
            emailService.sendMatchAlert(lostEmail,  lost.getUser().getName(),    lost.getItemName(),  match.getSecurityKey());
            System.out.println("📧 Sending match email to finder:     " + foundEmail);
            emailService.sendMatchAlert(foundEmail, found.getFinder().getName(), found.getItemName(), match.getSecurityKey());
        } catch (Exception e) {
            System.err.println("❌ EMAIL ERROR: " + e.getMessage());
        }
    }

    private void notifyUser(Long userId, Long matchId, String message) {
        System.out.println("🔔 NOTIFY: userId=" + userId + " matchId=" + matchId);
        if (notificationRepo.existsByRecipientIdAndMatchIdAndType(userId, matchId, "MATCH")) {
            System.out.println("  → Notification already exists, skipping duplicate.");
            return;
        }

        Notification notification = new Notification();
        notification.setRecipientId(userId);
        notification.setMatchId(matchId);
        notification.setType("MATCH");
        notification.setTitle("🎯 New Potential Match!");
        notification.setMessage(message);
        notification.setActionText("View Match");
        notification.setActionUrl("/dashboard/match-results?matchId=" + matchId);
        notificationRepo.save(notification);
        System.out.println("  → Notification saved to DB ✅");

        // Push real-time WebSocket toast
        messagingTemplate.convertAndSend("/topic/user_" + userId, notification);
        System.out.println("  → WebSocket push sent to /topic/user_" + userId + " ✅");
    }

    @Transactional
    public void confirmMatch(Long id) {
        Match match = matchRepo.findById(id).orElse(null);
        if (match != null) {
            match.setStatus("RESOLVED"); 
            matchRepo.saveAndFlush(match);

            LostItem lost = match.getLostItem();
            FoundItem found = match.getFoundItem();
            
            if (lost != null) {
                lost.setStatus("MATCHED");
                lostRepo.saveAndFlush(lost);
            }
            if (found != null) {
                found.setStatus("MATCHED");
                foundRepo.saveAndFlush(found);
            }
        }
    }

    @Transactional
    public void deleteMatch(Long id) {
        Match match = matchRepo.findById(id).orElse(null);
        if (match != null) {
            LostItem lost = match.getLostItem();
            FoundItem found = match.getFoundItem();
            if (lost != null) {
                lost.setStatus("PENDING");
                lostRepo.saveAndFlush(lost);
            }
            if (found != null) {
                found.setStatus("PENDING");
                foundRepo.saveAndFlush(found);
            }
            matchRepo.forceDelete(id);
            matchRepo.flush();
        }
    }
}
