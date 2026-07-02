package com.example.demo.Service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.Map;
import java.util.HashMap;

@Service
public class UserStatusService {

    private final StringRedisTemplate redisTemplate;
    
    private static final String ONLINE_KEY_PREFIX = "user:online:";
    private static final String LAST_SEEN_KEY_PREFIX = "user:lastseen:";

    public UserStatusService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void updateUserHeartbeat(Long userId) {
        redisTemplate.opsForValue().set(ONLINE_KEY_PREFIX + userId, "true", Duration.ofSeconds(10));
        redisTemplate.opsForValue().set(LAST_SEEN_KEY_PREFIX + userId, LocalDateTime.now().toString());
    }

    public Map<String, Object> getUserStatus(Long userId) {
        Map<String, Object> status = new HashMap<>();
        Boolean isOnline = redisTemplate.hasKey(ONLINE_KEY_PREFIX + userId);
        String lastSeen = redisTemplate.opsForValue().get(LAST_SEEN_KEY_PREFIX + userId);

        status.put("userId", userId);
        status.put("online", Boolean.TRUE.equals(isOnline));
        status.put("lastSeen", lastSeen != null ? lastSeen : "Unknown");
        return status;
    }
}

