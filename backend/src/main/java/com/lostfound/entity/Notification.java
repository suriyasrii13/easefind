package com.lostfound.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "app_notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long recipientId;
    private String title;
    private String message;
    private String type; // CHAT / MATCH
    private Long matchId;
    private String actionUrl;
    private String actionText;
    private boolean isRead = false;
    private Instant createdAt;

    public Notification() {
        this.createdAt = Instant.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRecipientId() { return recipientId; }
    public void setRecipientId(Long recipientId) { this.recipientId = recipientId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Long getMatchId() { return matchId; }
    public void setMatchId(Long matchId) { this.matchId = matchId; }

    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }

    public String getActionText() { return actionText; }
    public void setActionText(String actionText) { this.actionText = actionText; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
