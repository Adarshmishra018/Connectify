package com.example.demo.Util;

	import java.util.Date;

	import javax.crypto.SecretKey;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
	import org.springframework.stereotype.Component;

import com.example.demo.controllers.FriendController;

import io.jsonwebtoken.Jwts;
	import io.jsonwebtoken.security.Keys;

	@Component
	public class JwtUtil {
		
		private static final Logger logger = LogManager.getLogger(JwtUtil.class);


	    @Value("${jwt.secret}")
	    private String secret;

	    @Value("${jwt.expiration}")
	    private long expiration;

	    private SecretKey getSigningKey() {
	        return Keys.hmacShaKeyFor(secret.getBytes());
	    }

	    public String generateToken(Long userId, String email) {
        	logger.debug(" userId: {}"+ userId+" email: {}"+ email);
	        return Jwts.builder()
	                .subject(email)
	                .claim("userId", userId)
	                .issuedAt(new Date())
	                .expiration(new Date(System.currentTimeMillis() + expiration))
	                .signWith(getSigningKey())
	                .compact();
	    }

	    public String extractEmail(String token) {
        	logger.debug(" token: {}", token);
	        return Jwts.parser()
	                .verifyWith(getSigningKey())
	                .build()
	                .parseSignedClaims(token)
	                .getPayload()
	                .getSubject();
	    }

	    public Long extractUserId(String token) {
        	logger.debug(" token: {}", token);
	        return Jwts.parser()
	                .verifyWith(getSigningKey())
	                .build()
	                .parseSignedClaims(token)
	                .getPayload()
	                .get("userId", Long.class);
	    }

	    public boolean validateToken(String token) {
	        try {
	        	logger.debug(" token: {}", token);

	            Jwts.parser()
	                    .verifyWith(getSigningKey())
	                    .build()
	                    .parseSignedClaims(token);

	            return true;
	        } catch (Exception e) {
	            return false;
	    }
	}
}
