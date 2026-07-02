package com.example.demo.controllers;

import com.example.demo.Service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/register-token")
    public ResponseEntity<?> registerToken(
            @RequestParam Long userId,
            @RequestParam String token) {
        notificationService.registerToken(userId, token);
        return ResponseEntity.ok(Map.of("message", "Device token registered successfully"));
    }
}
