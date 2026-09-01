package com.example.demo.controllers;

import java.util.ArrayList;


import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.Entity.FriendEntity;
import com.example.demo.Entity.UserEntity;
import com.example.demo.Service.FriendService;
import com.example.demo.repository.FriendRepository;
import com.example.demo.repository.UserRepository;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;



@RestController
@RequestMapping("/api/auth/friends") // Corrected from '/api/auth/friends'
public class FriendController {
    private static final Logger logger = LogManager.getLogger(FriendController.class);
    private final FriendService friendService;
    // Constructor Injection (Unused repositories removed)
    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

     // Gets all friends of a specific user.
    @GetMapping("/{userId}")	//for fetching details from user Id
    public ResponseEntity<List<UserEntity>> getFriends(@PathVariable Long userId) {
        logger.debug("Fetching friends for user ID: {}", userId);
        List<UserEntity> friends = friendService.getFriends(userId);
        return ResponseEntity.ok(friends);
    }

     // Adds a friend connection.
    @PostMapping("/add") //for adding a new friend
    public ResponseEntity<Map<String, String>> addFriend(@RequestBody FriendEntity friend) {
        logger.debug("Adding friend relation between: {} and {}", friend.getUserId(), friend.getFriendId());
        String status = friendService.addFriend(friend);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", status));
    }
}




