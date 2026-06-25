package com.example.demo.filters;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Collections;
	import java.io.IOException;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
	import org.springframework.data.redis.core.StringRedisTemplate;
	import org.springframework.stereotype.Component;
	import org.springframework.web.filter.OncePerRequestFilter;

import com.example.demo.Util.JwtUtil;
import com.example.demo.controllers.FriendController;

import jakarta.servlet.FilterChain;
	import jakarta.servlet.ServletException;
	import jakarta.servlet.http.HttpServletRequest;
	import jakarta.servlet.http.HttpServletResponse;

	@Component
	public class JwtFilter extends OncePerRequestFilter {

		
		private static final Logger logger =
		        LogManager.getLogger(JwtFilter.class);
	    @Autowired 
	    private JwtUtil jwtUtil;

	    @Autowired
	    private StringRedisTemplate redisTemplate;

	    @Override
	    protected void doFilterInternal(
	            HttpServletRequest request,
	            HttpServletResponse response,
	            FilterChain filterChain
	    ) throws ServletException, IOException {

	        String path = request.getServletPath();
        	logger.debug("Inside OncePerRequestFilter  path: {}", path);


	        if (path.equals("/") ||path.equals("/api/auth/login") ||
	            path.equals("/api/auth/register") ||
	            path.endsWith(".html") ||
	            path.endsWith(".css") ||
	            path.endsWith(".js")) {

	            filterChain.doFilter(request, response);
	            return;
	        }

	        String authHeader = request.getHeader("Authorization");
        	logger.debug("Inside OncePerRequestFilter  authHeader: {}", authHeader);


	        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
	            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
	            response.getWriter().write("Missing token");
	            
	            return;
	        }

	        String token = authHeader.substring(7);
        	logger.debug("Inside OncePerRequestFilter  token: {}", token);

	        if (!jwtUtil.validateToken(token)) {
	            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
	            response.getWriter().write("Invalid token");
	            return;
	        }

	        Long userId = jwtUtil.extractUserId(token);
        	logger.debug("Inside OncePerRequestFilter  userId: {}", userId);


	        String redisToken = redisTemplate.opsForValue()
	                .get("LOGIN_USER_" + userId);

	        if (redisToken == null || !redisToken.equals(token)) {
	            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
	            response.getWriter().write("Session expired or logged out");
	            return;
	        }
	        UsernamePasswordAuthenticationToken authentication =
	                new UsernamePasswordAuthenticationToken(
	                        userId,
	                        null,
	                        Collections.emptyList()
	                );

	        SecurityContextHolder.getContext().setAuthentication(authentication);

	        filterChain.doFilter(request, response);
	        
	}
}
	

