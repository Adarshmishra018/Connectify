package com.example.demo.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.Entity.FriendEntity;

public interface FriendRepository extends JpaRepository<FriendEntity, Long> {

    List<FriendEntity> findByUserId(Long userId);
    
    // Add this to check for existing connections
    boolean existsByUserIdAndFriendId(Long userId, Long friendId);
}