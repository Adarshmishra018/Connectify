package com.example.demo.controllers;


import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.Entity.FriendEntity;
import com.example.demo.Entity.LoginResponse;
import com.example.demo.Entity.UserEntity;
import com.example.demo.Service.UserService;
import com.example.demo.Util.JwtUtil;
import com.example.demo.repository.FriendRepository;
import com.example.demo.repository.UserRepository;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class UserController {

	private static final Logger logger = LogManager.getLogger(UserController.class);

		@Autowired
	    private JwtUtil jwtUtil;

	    @Autowired
	    private StringRedisTemplate redisTemplate;


	  @Autowired
	    private FriendRepository friendRepository;

	    @Autowired
	    private UserRepository userRepository; 
	    
	    private final UserService userService;

	    public UserController( UserService userService) {//Constructor DI
	    	this.userService = userService;
	    }

	    @PostMapping("/register")
	    public UserEntity registerUser( @RequestBody UserEntity user) {// reads data from frontend Json body and convet into obj
	        return userService.registerUser(user);//returns Obj
	    }

	    @PostMapping("/login")
	    public ResponseEntity<?> loginUser( @RequestBody UserEntity user) {// reads data from frontend Json body and convet into obj
	        return userService.loginUser(user);
	    }

	    @PostMapping("/logout")
	    public ResponseEntity<?> logout(
	            @RequestHeader("Authorization")
	            String authHeader) {

	        return userService.logout(authHeader);
	    }

	    @GetMapping("/admin/AllUsers")
	    public List<UserEntity> getAllUsers() {

	        return userService.getAllUsers();
	    }

//	    @PostMapping("/register")
//	    public UserEntity registerUser(@RequestBody UserEntity user) {
//	        return userRepository.save(user);
//	    }
//	    
////	    @PostMapping("/login")
////	    public ResponseEntity<?> loginUser(@RequestBody UserEntity user) {
////
////	        UserEntity existingUser = userRepository.findByEmail(user.getEmail());
////
////	        if (existingUser == null) {
////	            return ResponseEntity.status(HttpStatus.NOT_FOUND)
////	                    .body("User not found");
////	        }
////
////	        if (!existingUser.getPassword().equals(user.getPassword())) {
////	            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
////	                    .body("Invalid password");
////	        }
////
////	        return ResponseEntity.ok(existingUser);
////	    }
//	    
//	    
//	    
//	   
//	    @PostMapping("/login")
//	    public ResponseEntity<?> loginUser(@RequestBody UserEntity user) {
//
//	        UserEntity existingUser = userRepository.findByEmail(user.getEmail());
//
//	        if (existingUser == null) {
//	            return ResponseEntity.status(HttpStatus.NOT_FOUND)
//	                    .body("User not found");
//	        }
//
//	        if (!existingUser.getPassword().equals(user.getPassword())) {
//	            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//	                    .body("Invalid password");
//	        }
//
//	        String token = jwtUtil.generateToken(
//	                existingUser.getId(),
//	                existingUser.getEmail()
//	        );
//
//	        redisTemplate.opsForValue().set(
//	                "LOGIN_USER_" + existingUser.getId(),
//	                token,
//	                java.time.Duration.ofMinutes(30)
//	        );
//
//	        return ResponseEntity.ok(
//	                new LoginResponse(
//	                        existingUser.getId(),
//	                        existingUser.getName(),
//	                        existingUser.getEmail(),
//	                        token
//	                )
//	        );
//	    }
//	    
//	    
//	    
//	    @PostMapping("/logout")
//	    public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
//
//	        String token = authHeader.substring(7);
//
//	        Long userId = jwtUtil.extractUserId(token);
//
//	        redisTemplate.delete("LOGIN_USER_" + userId);
//
//	        return ResponseEntity.ok("Logged out successfully");
//	    }
//	    
//	    
////	    @PostMapping("/add")
////	    public FriendEntity addFriend(@RequestBody FriendEntity friend) {
////	        return friendRepository.save(friend);
////	    }
//
//	    
//	    
//	    @GetMapping("/admin/AllUsers")
//	    public List<UserEntity> getAllUsers() {
//	        return userRepository.findAll();
//	    }
	
}
