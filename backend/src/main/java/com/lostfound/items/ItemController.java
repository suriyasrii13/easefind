package com.lostfound.items;

import com.lostfound.entity.FoundItem;
import com.lostfound.entity.LostItem;
import com.lostfound.entity.User;
import com.lostfound.repository.UserRepository;
import com.lostfound.service.FoundItemService;
import com.lostfound.service.LostItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api")

public class ItemController {

    @Autowired
    private LostItemService lostItemService;

    @Autowired
    private FoundItemService foundItemService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.lostfound.service.SmartMatchService matchService;

    @Autowired
    private com.lostfound.service.EmailService emailService;

    // ---------------- LOST ITEMS ----------------

    @PostMapping(value = "/lost-items", consumes = "multipart/form-data")
    public ResponseEntity<?> addLostItemMultipart(
            @RequestParam(value = "itemName", required = false) String itemName,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "contactInfo", required = false) String contactInfo,
            @RequestParam(value = "dateLost", required = false) String dateLost,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "isConfidential", defaultValue = "false") boolean isConfidential,
            @RequestParam(value = "uniqueIdentifier", required = false) String uniqueIdentifier,
            @RequestParam(value = "hiddenDetail", required = false) String hiddenDetail,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        System.out.println("DEBUG: addLostItemMultipart called with userId: " + userId + ", itemName: " + itemName);
        try {
            LostItem item = new LostItem();
            item.setItemName(itemName);
            item.setCategory(category);
            item.setDescription(description);
            item.setContactInfo(contactInfo);
            item.setLocation(location);
            if (dateLost == null || dateLost.trim().isEmpty()) {
                item.setDateLost(LocalDate.now());
            } else {
                item.setDateLost(LocalDate.parse(dateLost));
            }
            item.setConfidential(isConfidential);
            item.setUniqueIdentifier(uniqueIdentifier);
            item.setHiddenDetail(hiddenDetail);

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            item.setUser(user);

            if (image != null && !image.isEmpty()) {
                String fileName = saveImage(image);
                item.setImagePath(fileName);
            }

            System.out.println("DEBUG Submission: Attempting to save item to database...");
            LostItem savedItem = lostItemService.saveLostItem(item);
            System.out.println("DEBUG Submission: SUCCESS saving Lost Item Id: " + savedItem.getItemId());

            // --- AUTOMATED MATCHING HOOK ---
            final LostItem finalSavedItem = savedItem;
            CompletableFuture.runAsync(() -> {
                try {
                    matchService.processNewLostItem(finalSavedItem);
                    System.out.println("AI: Background matching complete for LOST item: " + itemName);
                } catch (Exception e) {
                    System.err.println("AI: Background scan failed: " + e.getMessage());
                }
            });

            // --- EMAIL CONFIRMATION ---
            try {
                emailService.sendReportConfirmation(user.getEmail(), user.getName(), itemName, "LOST");
            } catch (Exception e) {
                System.err.println("EMAIL_ERROR: Failed to send lost report confirmation: " + e.getMessage());
            }

            return ResponseEntity.ok(savedItem);
        } catch (Exception e) {
            System.err.println("CRITICAL ERROR in addLostItem: " + e.getMessage());
            e.printStackTrace();
            String errorMessage = "Error saving lost item: " + e.getClass().getSimpleName() + " - " + e.getMessage();
            return ResponseEntity.status(500).body(errorMessage);
        }
    }

    @GetMapping("/lost-items")
    public List<LostItem> getLostItems(@RequestParam(value = "userId", required = false) Long userId) {
        if (userId != null) {
            return lostItemService.getLostItemsByUser(userId);
        }
        return lostItemService.getAllLostItems();
    }

    // ---------------- FOUND ITEMS ----------------

    @PostMapping(value = "/found-items", consumes = "multipart/form-data")
    public ResponseEntity<?> addFoundItemMultipart(
            @RequestParam(value = "itemName", required = false) String itemName,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "contactInfo", required = false) String contactInfo,
            @RequestParam(value = "dateLost", required = false) String dateLost,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "isConfidential", defaultValue = "false") boolean isConfidential,
            @RequestParam(value = "uniqueIdentifier", required = false) String uniqueIdentifier,
            @RequestParam(value = "hiddenDetail", required = false) String hiddenDetail,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        System.out.println("DEBUG: addFoundItemMultipart called with userId: " + userId + ", itemName: " + itemName);
        try {
            System.out.println("Backend: RECEIVED Found Item Report Request for " + itemName);
            FoundItem item = new FoundItem();
            item.setItemName(itemName);
            item.setCategory(category);
            item.setDescription(description);
            item.setContactInfo(contactInfo);
            item.setLocation(location);

            if (dateLost == null || dateLost.isBlank()) {
                item.setDateFound(LocalDate.now());
            } else {
                item.setDateFound(LocalDate.parse(dateLost));
            }
            item.setStatus("PENDING");
            item.setConfidential(isConfidential);
            item.setUniqueIdentifier(uniqueIdentifier);
            item.setHiddenDetail(hiddenDetail);

            User finder = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));
            item.setFinder(finder);

            if (image != null && !image.isEmpty()) {
                String fileName = saveImage(image);
                item.setImagePath(fileName);
            }

            System.out.println("DEBUG Submission: Attempting to save found item...");
            FoundItem savedItem = foundItemService.save(item);
            System.out.println("DEBUG Submission: SUCCESS saving Found Item Id: " + savedItem.getItemId());

            // --- AUTOMATED MATCHING HOOK ---
            final FoundItem finalSavedItem = savedItem;
            CompletableFuture.runAsync(() -> {
                try {
                    matchService.processNewFoundItem(finalSavedItem);
                    System.out.println("AI: Background matching complete for FOUND item: " + itemName);
                } catch (Exception e) {
                    System.err.println("AI: Background scan failed: " + e.getMessage());
                }
            });

            // --- EMAIL CONFIRMATION ---
            try {
                emailService.sendReportConfirmation(finder.getEmail(), finder.getName(), itemName, "FOUND");
            } catch (Exception e) {
                System.err.println("EMAIL_ERROR: Failed to send found report confirmation: " + e.getMessage());
            }

            return ResponseEntity.ok(savedItem);

        } catch (Exception e) {
            System.err.println("CRITICAL ERROR in addFoundItem: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error saving found item: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        }
    }

    @GetMapping("/found-items")
    public List<FoundItem> getFoundItems(@RequestParam(value = "userId", required = false) Long userId) {
        if (userId != null) {
            return foundItemService.getFoundItemsByUser(userId);
        }
        return foundItemService.getAll();
    }

    @DeleteMapping("/lost-items/{id}")
    public ResponseEntity<?> deleteLostItem(@PathVariable Long id) {
        try {
            lostItemService.deleteLostItem(id);
            return ResponseEntity.ok("Lost item deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting lost item: " + e.getMessage());
        }
    }

    @DeleteMapping("/found-items/{id}")
    public ResponseEntity<?> deleteFoundItem(@PathVariable Long id) {
        try {
            foundItemService.delete(id);
            return ResponseEntity.ok("Found item deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error deleting found item: " + e.getMessage());
        }
    }

    // ---------------- HELPERS ----------------

    private String saveImage(MultipartFile image) throws Exception {
        // Use a relative path to support Linux cloud environments (e.g. Railway)
        String baseDir = "./uploads/";
        File uploadFolder = new File(baseDir);
        if (!uploadFolder.exists()) {
            uploadFolder.mkdirs();
        }
        String fileName = System.currentTimeMillis() + "_" + image.getOriginalFilename();
        File file = new File(uploadFolder, fileName);
        
        java.nio.file.Files.copy(image.getInputStream(), file.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        
        return fileName;
    }
}
