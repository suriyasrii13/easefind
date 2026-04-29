package com.lostfound.service;

import com.lostfound.entity.FoundItem;
import com.lostfound.repository.FoundItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

import com.lostfound.repository.MatchRepository;
import com.lostfound.repository.ClaimRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FoundItemService {

    @Autowired
    private FoundItemRepository foundItemRepository;

    @Autowired
    private MatchRepository matchRepository;

    @Autowired
    private ClaimRepository claimRepository;

    public FoundItem save(FoundItem item) {
        return foundItemRepository.save(item);
    }

    public List<FoundItem> getAll() {
        return foundItemRepository.findAll();
    }

    public List<FoundItem> getFoundItemsByUser(Long userId) {
        return foundItemRepository.findByFinder_UserId(userId);
    }

    @Transactional
    public void delete(Long id) {
        matchRepository.deleteByFoundItemItemId(id);
        claimRepository.deleteByFoundItemItemId(id);
        foundItemRepository.deleteById(id);
    }
}
