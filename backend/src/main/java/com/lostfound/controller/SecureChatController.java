package com.lostfound.controller;

import com.lostfound.entity.*;
import com.lostfound.repository.*;
import com.lostfound.service.EmailService;
import com.lostfound.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.context.ApplicationContext;

import java.time.LocalDateTime;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")

public class SecureChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepo;

    @Autowired
    private NotificationRepository notificationRepo;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private MatchRepository matchRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private GeminiService geminiService;

    // 1. Get messages for a match (and trigger AI Bot if empty)
    @GetMapping("/{matchId}")
    public List<ChatMessage> getMessages(@PathVariable Long matchId) {
        List<ChatMessage> messages = chatMessageRepo.findByMatchIdOrderByTimestampAsc(matchId);
        
        if (messages.isEmpty()) {
            Match match = matchRepo.findById(matchId).orElse(null);
            if (match != null) {
                try {
                    String botMessage = geminiService.moderateChat(match.getLostItem().getDescription(), match.getFoundItem().getDescription());
                    
                    ChatMessage botChat = new ChatMessage();
                    botChat.setMatchId(matchId);
                    botChat.setSenderId(0L);
                    botChat.setContent(botMessage);
                    botChat.setTimestamp(LocalDateTime.now());
                    chatMessageRepo.save(botChat);
                    
                    messages.add(botChat);
                } catch (Exception e) {
                    System.err.println("AI Moderator unavailable: " + e.getMessage());
                }
            }
        }
        return messages;
    }

    // 2. Send a new message
    @PostMapping("/send")
    public ResponseEntity<?> sendMessage(@RequestBody ChatMessage message) {
        try {
            message.setTimestamp(LocalDateTime.now());
            ChatMessage saved = chatMessageRepo.save(message);
            messagingTemplate.convertAndSend("/topic/chat_" + message.getMatchId(), saved);

            Match match = matchRepo.findById(message.getMatchId()).orElse(null);
            User sender = userRepo.findById(message.getSenderId()).orElse(null);

            if (match != null && sender != null) {
                Long recipientId;
                if (message.getSenderId().equals(match.getLostItem().getUser().getUserId())) {
                    recipientId = match.getFoundItem().getFinder().getUserId();
                } else {
                    recipientId = match.getLostItem().getUser().getUserId();
                }

                Notification notification = new Notification();
                notification.setRecipientId(recipientId);
                notification.setMatchId(match.getMatchId());
                notification.setType("CHAT");
                notification.setTitle("New Message from " + sender.getName());
                notification.setMessage(sender.getName() + " sent you a message about: " + match.getLostItem().getItemName());
                notification.setActionText("Reply");
                notification.setActionUrl("/dashboard/match-results");
                notificationRepo.save(notification);
                messagingTemplate.convertAndSend("/topic/user_" + recipientId, notification);
            }
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error sending message: " + e.getMessage());
        }
    }

    // 3. Initiate Chat
    @PostMapping("/initiate/{matchId}")
    public ResponseEntity<?> initiateChat(@PathVariable Long matchId, @RequestParam Long senderId) {
        try {
            List<ChatMessage> existing = chatMessageRepo.findByMatchIdOrderByTimestampAsc(matchId);
            if (!existing.isEmpty()) {
                return ResponseEntity.ok("Chat already initiated. No email sent.");
            }

            Match match = matchRepo.findById(matchId).orElse(null);
            User sender = userRepo.findById(senderId).orElse(null);

            if (match != null && sender != null) {
                User recipient = senderId.equals(match.getLostItem().getUser().getUserId()) ? 
                                match.getFoundItem().getFinder() : match.getLostItem().getUser();

                if (recipient != null) {
                    String securityKey = match.getSecurityKey();
                                        
                    EmailService emailMsgService = context.getBean(EmailService.class);
                    emailMsgService.sendChatRequestAlert(recipient.getEmail(), sender.getName(), match.getLostItem().getItemName(), securityKey);
                    return ResponseEntity.ok("Chat initiation email sent to " + recipient.getName());
                }
            }
            return ResponseEntity.badRequest().body("Invalid match or user");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error initiating chat: " + e.getMessage());
        }
    }
}
