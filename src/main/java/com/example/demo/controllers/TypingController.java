package com.example.demo.controllers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.example.demo.Entity.TypingRequest;
import com.example.demo.Service.TypingService;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/typing")
@CrossOrigin(origins = "*") // restrict this in production
public class TypingController {

    @Autowired
    private TypingService typingService;

    // Client calls this while the user is actively typing
    @PostMapping
    public Map<String, Object> setTyping(@RequestBody TypingRequest request) {
        typingService.setUserTyping(request.getRoomId(), request.getUserId());
        return Map.of("success", true);
    }

    // Client calls this when user stops typing or sends the message
    @DeleteMapping
    public Map<String, Object> clearTyping(@RequestBody TypingRequest request) {
        typingService.clearUserTyping(request.getRoomId(), request.getUserId());
        return Map.of("success", true);
    }

    // Polling clients hit this to check who's typing in a room
    @GetMapping("/{roomId}")
    public Map<String, Object> getTypingUsers(
            @PathVariable String roomId,
            @RequestParam String currentUserId) {
        Set<String> typingUsers = typingService.getTypingUsers(roomId, currentUserId);
        return Map.of("typingUsers", typingUsers);
    }
}