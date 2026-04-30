package com.lostfound.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;

@Service
public class AIService {

    @Autowired
    private GeminiService geminiService;

    public String callAI(
            File lostImage,
            File foundImage,
            String lostDescription,
            String foundDescription) {

        // Use Gemini to evaluate the match
        return geminiService.evaluateMatch(lostImage, foundImage, lostDescription, foundDescription);
    }
}
