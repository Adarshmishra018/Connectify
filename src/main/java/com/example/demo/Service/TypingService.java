package com.example.demo.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashSet;
import java.util.Set;

@Service
public class TypingService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    private static final Duration TYPING_TTL = Duration.ofSeconds(3);
    private static final String KEY_PREFIX = "typing:";

    // Called when a user sends a typing ping
    public void setUserTyping(String roomId, String userId) {
        String key = KEY_PREFIX + roomId + ":" + userId;
        redisTemplate.opsForValue().set(key, "1", TYPING_TTL);
    }

    // Called explicitly when user stops typing or sends the message
    public void clearUserTyping(String roomId, String userId) {
        String key = KEY_PREFIX + roomId + ":" + userId;
        redisTemplate.delete(key);
    }

    // Called by polling clients to see who's currently typing
    public Set<String> getTypingUsers(String roomId, String excludeUserId) {
        String pattern = KEY_PREFIX + roomId + ":*";
        Set<String> keys = redisTemplate.keys(pattern);
        Set<String> typingUsers = new HashSet<>();

        if (keys != null) {
            for (String key : keys) {
                String userId = key.substring(key.lastIndexOf(":") + 1);
                if (!userId.equals(excludeUserId)) {
                    typingUsers.add(userId);
                }
            }
        }
        return typingUsers;
    }
}