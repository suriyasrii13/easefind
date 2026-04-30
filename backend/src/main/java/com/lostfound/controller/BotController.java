package com.lostfound.controller;

import com.lostfound.service.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
public class BotController {

    @Autowired
    private GeminiService geminiService;

    @PostMapping("/ask")
    public ResponseEntity<?> askChatBot(@RequestBody Map<String, String> requestData) {
        try {
            String query = requestData.get("query");
            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("response", "Query cannot be empty"));
            }

            String aiResponse = geminiService.askChatBot(query);
            return ResponseEntity.ok(Map.of("response", aiResponse));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("response", "I'm having trouble connecting to my neural network right now. Please test your connection and try again!"));
        }
    }
}
