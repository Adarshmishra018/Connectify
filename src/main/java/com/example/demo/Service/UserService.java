package com.example.demo.Service;

import java.time.Duration;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.example.demo.Entity.LoginResponse;
import com.example.demo.Entity.UserEntity;
import com.example.demo.Util.JwtUtil;
import com.example.demo.controllers.FriendController;
import com.example.demo.repository.UserRepository;

@Service
public class UserService {
	
	private static final Logger logger = LogManager.getLogger(UserService.class);


    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;
    
    // 2. Instantiate BCryptPasswordEncoder
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    public UserService(UserRepository userRepository, JwtUtil jwtUtil, StringRedisTemplate redisTemplate) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.redisTemplate = redisTemplate;
    }
    public UserEntity registerUser(UserEntity user) {
        // 3. Hash the password before saving it to the DB
        String hashedPassword = passwordEncoder.encode(user.getPassword());
        user.setPassword(hashedPassword);
        return userRepository.save(user);
    }
    public ResponseEntity<?> loginUser(UserEntity user) {
        UserEntity existingUser = userRepository.findByEmail(user.getEmail());
        if (existingUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("User not found");
        }
        // 4. Compare the raw password from login request with hashed password in DB
        if (!passwordEncoder.matches(user.getPassword(), existingUser.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid password");
        }
        String token = jwtUtil.generateToken(
                existingUser.getId(),
                existingUser.getEmail()
        );
        redisTemplate.opsForValue().set(
                "LOGIN_USER_" + existingUser.getId(),
                token,
                Duration.ofMinutes(30)
        );
        return ResponseEntity.ok(
                new LoginResponse(
                        existingUser.getId(),
                        existingUser.getName(),
                        existingUser.getEmail(),
                        token
                )
        );
    }
    public ResponseEntity<?> logout(String authHeader) {
        String token = authHeader.substring(7);
        Long userId = jwtUtil.extractUserId(token);
        redisTemplate.delete("LOGIN_USER_" + userId);
        return ResponseEntity.ok("Logged out successfully");
    }
    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }
	
    public boolean updatePassword(String email, String newPassword) {
        UserEntity user = userRepository.findByEmail(email);
        if (user == null) {
            return false;
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return true;
    }
    public ResponseEntity<?> loginOrRegisterOAuthUser(String email, String name) {
        UserEntity user = userRepository.findByEmail(email);
        if (user == null) {
            user = new UserEntity();
            user.setEmail(email);
            user.setName(name);
            user.setPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));
            user = userRepository.save(user);
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        redisTemplate.opsForValue().set(
                "LOGIN_USER_" + user.getId(),
                token,
                java.time.Duration.ofMinutes(30)
        );

        return ResponseEntity.ok(
                new LoginResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        token
                )
        );
    }

//
//    private final UserRepository userRepository;
//    private final JwtUtil jwtUtil;
//    private final StringRedisTemplate redisTemplate;
//
//    public UserService(UserRepository userRepository,JwtUtil jwtUtil,StringRedisTemplate redisTemplate) {//Constructor DI
//        this.userRepository = userRepository;
//        this.jwtUtil = jwtUtil;
//        this.redisTemplate = redisTemplate;
//    }
//
//    public UserEntity registerUser(UserEntity user) {
//        return userRepository.save(user);//save user and return entity
//    }
//
//    public ResponseEntity<?> loginUser(UserEntity user) {
//        UserEntity existingUser = userRepository.findByEmail(user.getEmail());//existingUser has all data from login
//        if (existingUser == null) {//check if user exists
//            return ResponseEntity.status(HttpStatus.NOT_FOUND)
//                    .body("User not found");
//        }
//
//        if (!existingUser.getPassword()
//                .equals(user.getPassword())) {
//
//            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//                    .body("Invalid password");
//        }
//
//        String token = jwtUtil.generateToken(
//                existingUser.getId(),
//                existingUser.getEmail()
//        );
//
//        redisTemplate.opsForValue().set(
//                "LOGIN_USER_" + existingUser.getId(),
//                token,
//                Duration.ofMinutes(30)
//        );
//
//        return ResponseEntity.ok(
//                new LoginResponse(
//                        existingUser.getId(),
//                        existingUser.getName(),
//                        existingUser.getEmail(),
//                        token
//                )
//        );
//    }
//
//    public ResponseEntity<?> logout(String authHeader) {
//
//        String token = authHeader.substring(7);
//
//        Long userId = jwtUtil.extractUserId(token);
//
//        redisTemplate.delete("LOGIN_USER_" + userId);
//
//        return ResponseEntity.ok("Logged out successfully");
//    }
//
//    public List<UserEntity> getAllUsers() {
//        return userRepository.findAll();
//    }
}