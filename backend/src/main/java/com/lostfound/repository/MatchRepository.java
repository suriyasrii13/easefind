package com.lostfound.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.lostfound.entity.Match;
import com.lostfound.entity.LostItem;
import com.lostfound.entity.FoundItem;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

public interface MatchRepository extends JpaRepository<Match, Long> {

    boolean existsByLostItemAndFoundItem(LostItem lostItem, FoundItem foundItem);

    @Transactional
    @Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Match m WHERE m.lostItem.itemId = :itemId")
    void deleteByLostItemItemId(Long itemId);

    @Transactional
    @Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Match m WHERE m.foundItem.itemId = :itemId")
    void deleteByFoundItemItemId(Long itemId);

    @Transactional
    @Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Match m WHERE m.matchId = :matchId")
    void forceDelete(Long matchId);

    java.util.List<Match> findByLostItemUserUserIdOrFoundItemFinderUserId(Long lostUserId, Long finderUserId);
}
