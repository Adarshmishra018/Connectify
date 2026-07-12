package com.example.demo.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import com.example.demo.Entity.UserEntity;
import com.example.demo.Service.UserService;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class GoogleAuthController {

    @Autowired
    private UserService userService;

    private final RestTemplate restTemplate = new RestTemplate();

    // Replace with your actual Google Client ID from Google Cloud Console
    private static final String GOOGLE_CLIENT_ID = "1098423434890-r7daqjuoi7hgdcguk2r87gad6qnpcdd2.apps.googleusercontent.com";

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken");
        if (idToken == null || idToken.isEmpty()) {
            return ResponseEntity.badRequest().body("Google ID Token is required");
        }

        try {
            // Verify Google ID Token via Google tokeninfo endpoint
            String googleVerificationUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
            @SuppressWarnings("rawtypes")
            ResponseEntity<Map> response = restTemplate.getForEntity(googleVerificationUrl, Map.class);

            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Google ID Token");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> tokenClaims = response.getBody();

            // Verify audience matches our Client ID
            String aud = (String) tokenClaims.get("aud");
            if (aud == null || !aud.equals(GOOGLE_CLIENT_ID)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token audience mismatch");
            }

            String email = (String) tokenClaims.get("email");
            String name = (String) tokenClaims.get("name");

            if (email == null) {
                return ResponseEntity.badRequest().body("Email not provided by Google account");
            }

            // Authenticate user & retrieve local JWT token mapping
            return userService.loginOrRegisterOAuthUser(email, name);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Authentication failed: " + e.getMessage());
        }
    }
}

