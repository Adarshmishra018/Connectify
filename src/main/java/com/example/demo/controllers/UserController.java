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
	
}
