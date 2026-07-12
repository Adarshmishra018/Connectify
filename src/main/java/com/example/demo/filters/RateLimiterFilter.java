package com.example.demo.filters;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.time.Duration;

@Component
public class RateLimiterFilter implements Filter {

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final int MAX_REQUESTS_PER_MINUTE = 60;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String ip = httpRequest.getRemoteAddr();
        String path = httpRequest.getServletPath();
        
        // Construct a unique key for the IP + API endpoint combination
        String redisKey = "rate:limit:" + ip + ":" + path;

        // Exclude high-frequency indicators, WebSocket signaling, and static assets from rate limiting
        if (path.equals("/signal") || 
            path.startsWith("/api/typing") || 
            path.contains("/heartbeat") || 
            path.endsWith(".html") || 
            path.endsWith(".css") || 
            path.endsWith(".js") || 
            path.equals("/favicon.ico")) {
            System.out.println("[RateLimiterFilter] Bypassed rate limiting for: " + path);
            chain.doFilter(request, response);
            return;
        }

        // Atomic increment
        Long currentRequests = redisTemplate.opsForValue().increment(redisKey);

        if (currentRequests == null) {
            httpResponse.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            return;
        }

        if (currentRequests == 1) {
            // First request in this window: set expiration to 60 seconds
            redisTemplate.expire(redisKey, Duration.ofSeconds(60));
        }

        if (currentRequests > MAX_REQUESTS_PER_MINUTE) {
            System.out.println("[RateLimiterFilter] RATE LIMIT EXCEEDED for path: " + path + " (IP: " + ip + ", Request count: " + currentRequests + ")");
            httpResponse.setStatus(429); // 429 Too Many Requests
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\": \"Too many requests. Please try again later.\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}

