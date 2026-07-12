package com.example.demo.controllers;

import org.springframework.web.bind.annotation.RequestMapping;

import com.example.demo.Service.UserStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/status")
public class UserStatusController {

    private final UserStatusService userStatusService;

    public UserStatusController(UserStatusService userStatusService) {
        this.userStatusService = userStatusService;
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<?> sendHeartbeat(@RequestParam Long userId) {
        userStatusService.updateUserHeartbeat(userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable Long userId) {
        return ResponseEntity.ok(userStatusService.getUserStatus(userId));
    }
}

