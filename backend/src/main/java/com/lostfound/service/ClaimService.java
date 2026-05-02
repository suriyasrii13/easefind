package com.lostfound.service;

import com.lostfound.dto.ClaimRequest;
import com.lostfound.entity.*;
import com.lostfound.enums.ClaimStatus;
import com.lostfound.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final LostItemRepository lostItemRepository;
    private final FoundItemRepository foundItemRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;

    public ClaimService(ClaimRepository claimRepository,
                        LostItemRepository lostItemRepository,
                        FoundItemRepository foundItemRepository,
                        UserRepository userRepository,
                        NotificationRepository notificationRepository,
                        SimpMessagingTemplate messagingTemplate,
                        EmailService emailService) {

        this.claimRepository = claimRepository;
        this.lostItemRepository = lostItemRepository;
        this.foundItemRepository = foundItemRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
        this.emailService = emailService;
    }

    // 🔥 FIXED VERSION
    public Claim raiseClaim(ClaimRequest request) {

        LostItem lostItem = lostItemRepository.findById(request.getLostItemId())
                .orElseThrow(() -> new RuntimeException("Lost item not found"));

        FoundItem foundItem = foundItemRepository.findById(request.getFoundItemId())
                .orElseThrow(() -> new RuntimeException("Found item not found"));

        User claimant = userRepository.findById(request.getClaimantUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Claim claim = new Claim();
        claim.setLostItem(lostItem);
        claim.setFoundItem(foundItem);   // ✅ THIS FIXES NULL ERROR
        claim.setClaimantUserId(claimant.getUserId());
        claim.setOwnerUserId(lostItem.getUser().getUserId());
        claim.setProofDescription(request.getProofDescription());
        claim.setStatus(ClaimStatus.PENDING);

        Claim savedClaim = claimRepository.save(claim);

        // --- NOTIFY OWNER ---
        Long ownerId = savedClaim.getOwnerUserId();
        String msg = claimant.getName() + " has raised a claim on your item: " + lostItem.getItemName();
        sendNotification(ownerId, "New Claim Received!", msg, "/dashboard/match-results");
        
        try {
            User owner = userRepository.findById(ownerId).orElse(null);
            if (owner != null) {
                String securityKey = (lostItem != null && lostItem.getUniqueIdentifier() != null) 
                                   ? lostItem.getUniqueIdentifier() 
                                   : (foundItem != null ? foundItem.getUniqueIdentifier() : "N/A");
                emailService.sendMatchAlert(owner.getEmail(), owner.getName(), lostItem.getItemName() + " (Claim Raised)", securityKey);
            }
        } catch (Exception e) {}

        return savedClaim;
    }

    public List<Claim> getClaimsForOwner(Long ownerId) {
        return claimRepository.findByOwnerUserId(ownerId);
    }

    public Claim approveClaim(Long claimId) {
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new RuntimeException("Claim not found"));

        claim.setStatus(ClaimStatus.APPROVED);
        Claim saved = claimRepository.save(claim);

        // --- NOTIFY CLAIMANT ---
        String msg = "Your claim for '" + claim.getLostItem().getItemName() + "' has been APPROVED!";
        sendNotification(claim.getClaimantUserId(), "Claim Approved!", msg, "/dashboard/match-results");

        return saved;
    }

    public Claim rejectClaim(Long claimId) {
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new RuntimeException("Claim not found"));

        claim.setStatus(ClaimStatus.REJECTED);
        Claim saved = claimRepository.save(claim);

        // --- NOTIFY CLAIMANT ---
        String msg = "Your claim for '" + claim.getLostItem().getItemName() + "' has been rejected.";
        sendNotification(claim.getClaimantUserId(), "Claim Privacy Notice", msg, "/dashboard/match-results");

        return saved;
    }

    private void sendNotification(Long userId, String title, String message, String url) {
        Notification notification = new Notification();
        notification.setRecipientId(userId);
        notification.setType("CLAIM");
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setActionText("View Status");
        notification.setActionUrl(url);
        notificationRepository.save(notification);
        messagingTemplate.convertAndSend("/topic/user_" + userId, notification);
    }
}
