package com.example.demo.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignallingHandler extends TextWebSocketHandler {

    // Store active user sessions by their user ID
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Retrieve userId from query param: ws://localhost:8080/signal?userId=123
        String query = session.getUri().getQuery();
        if (query != null && query.startsWith("userId=")) {
            String userId = query.split("=")[1];
            session.getAttributes().put("userId", userId);
            sessions.put(userId, session);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // Parse message payload (expects format: { type, senderId, receiverId, data })
        Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
        String receiverId = (String) payload.get("receiverId");

        if (receiverId != null && sessions.containsKey(receiverId)) {
            WebSocketSession receiverSession = sessions.get(receiverId);
            if (receiverSession.isOpen()) {
                // Forward the signaling message directly to the target receiver
                receiverSession.sendMessage(new TextMessage(message.getPayload()));
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String userId = (String) session.getAttributes().get("userId");
        if (userId != null) {
            sessions.remove(userId);
        }
    }
}
