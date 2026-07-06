package com.example.demo.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.Entity.UserEntity;
import com.example.demo.Service.EmailService;
import com.example.demo.Service.UserService;
import com.example.demo.repository.UserRepository;

import java.time.Duration;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/auth/forgot-password")
@CrossOrigin(origins = "*")
public class ForgotPasswordController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @PostMapping("/send-code")
    public ResponseEntity<?> sendCode(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }

        UserEntity user = userRepository.findByEmail(email);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Email address not registered");
        }

        String code = String.format("%06d", new Random().nextInt(999999));
        redisTemplate.opsForValue().set("FORGOT_PWD_CODE_" + email, code, Duration.ofMinutes(5));
        emailService.sendVerificationEmail(email, code);

        return ResponseEntity.ok(Map.of("message", "Verification code sent to your email. Please check your inbox and console logs."));
    }

    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyCode(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String code = request.get("code");

        if (email == null || code == null) {
            return ResponseEntity.badRequest().body("Email and verification code are required");
        }

        String cachedCode = redisTemplate.opsForValue().get("FORGOT_PWD_CODE_" + email);
        if (cachedCode == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Verification code expired or invalid request");
        }

        if (!cachedCode.equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid verification code");
        }

        redisTemplate.opsForValue().set("FORGOT_PWD_VERIFIED_" + email, "true", Duration.ofMinutes(5));
        redisTemplate.delete("FORGOT_PWD_CODE_" + email);

        return ResponseEntity.ok(Map.of("message", "Code verified successfully. You can now reset your password."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String newPassword = request.get("newPassword");

        if (email == null || newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email and new password are required");
        }

        String isVerified = redisTemplate.opsForValue().get("FORGOT_PWD_VERIFIED_" + email);
        if (isVerified == null || !isVerified.equals("true")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Verification required before resetting password");
        }

        boolean updated = userService.updatePassword(email, newPassword);
        if (!updated) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update password");
        }

        redisTemplate.delete("FORGOT_PWD_VERIFIED_" + email);
        return ResponseEntity.ok(Map.of("message", "Password reset successful! You can now log in with your new password."));
    }
}

