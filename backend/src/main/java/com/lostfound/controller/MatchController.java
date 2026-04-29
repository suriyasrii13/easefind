package com.lostfound.controller;

import java.io.File;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;

import com.lostfound.entity.Match;
import com.lostfound.service.SmartMatchService;
import com.lostfound.service.AIService;

@RestController
@RequestMapping("/api/match")
 // Align with ItemController
public class MatchController {

    @Autowired
    private SmartMatchService matchService;

    @Autowired
    private com.lostfound.repository.MatchRepository matchRepo;

    @Autowired
    private AIService aiService;   // ✅ Inject AI service

    // 1️⃣ Filtered endpoint
    @GetMapping
    public List<Match> getMatches(@RequestParam(value = "userId", required = false) Long userId) {
        if (userId != null) {
            return matchService.getMatchesForUser(userId);
        }
        return matchRepo.findAll();
    }

    // 2️⃣ NEW AI endpoint
    @PostMapping("/check")
    public ResponseEntity<?> checkMatch(
            @RequestParam("lostImage") MultipartFile lostImage,
            @RequestParam("foundImage") MultipartFile foundImage,
            @RequestParam("lostDescription") String lostDescription,
            @RequestParam("foundDescription") String foundDescription
    ) throws Exception {

    	File lostFile = null;
    	File foundFile = null;

    	try {
    	    lostFile = File.createTempFile("lost-", ".jpg");
    	    lostImage.transferTo(lostFile);

    	    foundFile = File.createTempFile("found-", ".jpg");
    	    foundImage.transferTo(foundFile);

    	    String result = aiService.callAI(
    	            lostFile,
    	            foundFile,
    	            lostDescription,
    	            foundDescription
    	    );

    	    return ResponseEntity.ok(result);

    	} finally {
    	    if (lostFile != null) lostFile.delete();
    	    if (foundFile != null) foundFile.delete();
    	}
    }

    // 3️⃣ NEW confirm match endpoint
    @PostMapping("/confirm/{id}")
    public ResponseEntity<?> confirmMatch(@PathVariable("id") Long id) {
        try {
            matchService.confirmMatch(id);
            return ResponseEntity.ok("Match confirmed successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error confirming match: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMatch(@PathVariable("id") Long id) {
        try {
            matchService.deleteMatch(id);
            return ResponseEntity.ok("Match deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting match: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verifySerialNumber(
            @PathVariable Long id, 
            @RequestBody Map<String, String> payload) {
        
        Match match = matchRepo.findById(id).orElse(null);
        if (match == null) return ResponseEntity.notFound().build();
        
        String providedSerial = payload.get("serialNumber");
        if (providedSerial != null) {
            providedSerial = providedSerial.trim();
        }
        
        String lostSerial = match.getLostItem().getUniqueIdentifier();
        String foundSerial = match.getFoundItem().getUniqueIdentifier();
        String matchKey = match.getSecurityKey();
        
        // Match if provided serial matches either item's ID or the generated match security key
        boolean isValid = (lostSerial != null && lostSerial.trim().equalsIgnoreCase(providedSerial)) || 
                          (foundSerial != null && foundSerial.trim().equalsIgnoreCase(providedSerial)) ||
                          (matchKey != null && matchKey.trim().equalsIgnoreCase(providedSerial));
                          
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("verified", isValid);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/handshake")
    public ResponseEntity<?> qrHandshake(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        
        Match match = matchRepo.findById(id).orElse(null);
        if (match == null) return ResponseEntity.notFound().build();
        
        String providedKey = payload.get("key");
        if (providedKey == null) return ResponseEntity.badRequest().body("Key is required");
        
        if (match.getSecurityKey().equalsIgnoreCase(providedKey.trim())) {
            matchService.confirmMatch(id); // Reusing confirmMatch to mark as RESOLVED
            return ResponseEntity.ok("Handshake successful. Item marked as returned.");
        } else {
            return ResponseEntity.status(401).body("Invalid security key for handshake.");
        }
    }
}

