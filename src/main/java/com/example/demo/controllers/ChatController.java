package com.example.demo.controllers;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.Service.ChatService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth") // Kept as /api/auth to match your security configuration
public class ChatController {

    private static final Logger logger = LogManager.getLogger(ChatController.class);
    private final ChatService chatService;

    // Constructor Injection
    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }


     // Sends a chat message.
    @PostMapping("/send")
    public ResponseEntity<ChatMessageEntity> sendMessage(@RequestBody ChatMessageEntity chatMessage) {
        logger.debug("Processing request to send message from sender: {}", chatMessage.getSenderId());
        ChatMessageEntity responseEntity = chatService.sendMessage(chatMessage);
        return ResponseEntity.status(HttpStatus.CREATED).body(responseEntity);
    }

    
   // Fetches chat history between sender and receiver (with support for paging).
    @GetMapping("/messages")
    public ResponseEntity<List<ChatMessageEntity>> getChatMessages(@RequestParam Long senderId, @RequestParam Long receiverId,
            @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
    	
        logger.debug("Fetching chat messages between sender {} and receiver {}", senderId, receiverId);
        List<ChatMessageEntity> messages;
        if (page != null) {
            int pageSize = (size != null) ? size : 20;
            messages = chatService.getChatMessagesPaginated(senderId, receiverId, page, pageSize);
        } else {
            messages = chatService.getChatMessages(senderId, receiverId);
        }
        return ResponseEntity.ok(messages);
    }

    /**
     * Fetches the list of last messages (inbox) for a user.
     */
    @GetMapping("/inbox/{userId}")
    public ResponseEntity<List<ChatMessageEntity>> getInbox(@PathVariable Long userId) {
        logger.debug("Fetching inbox for user ID: {}", userId);
        List<ChatMessageEntity> inbox = chatService.getInbox(userId);
        return ResponseEntity.ok(inbox);
    }

    /**
     * Marks messages sent by a friend to a user as READ.
     */
    @PostMapping("/messages/read")
    public ResponseEntity<?> markAsRead(@RequestParam Long userId, @RequestParam Long friendId) {
        chatService.markMessagesAsRead(userId, friendId);
        return ResponseEntity.ok().build();
    }

    /**
     * Marks messages sent to a user as DELIVERED.
     */
    @PostMapping("/messages/deliver")
    public ResponseEntity<?> markAsDelivered(@RequestParam Long userId) {
        chatService.markMessagesAsDelivered(userId);
        return ResponseEntity.ok().build();
    }

    // New Features: Edit, Delete & View Once Endpoints
    /**
     * Edits the text content of a message.
     */
    @PutMapping("/messages/{messageId}/edit")
    public ResponseEntity<?> editMessage(
            @PathVariable Long messageId,
            @RequestParam Long senderId,
            @RequestBody Map<String, String> body) {
        logger.debug("Editing message ID: {} by sender: {}", messageId, senderId);
        String newText = body.get("message");
        if (newText == null || newText.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Message content cannot be empty");
        }
        ChatMessageEntity updated = chatService.editMessage(messageId, senderId, newText);
        return ResponseEntity.ok(updated);
    }

    /**
     * Hides a message for the requesting user ("Delete for Me").
     */
    @PostMapping("/messages/{messageId}/delete-for-me")
    public ResponseEntity<?> deleteForMe(
            @PathVariable Long messageId, 
            @RequestParam Long userId) {
        logger.debug("Deleting message ID: {} for user: {}", messageId, userId);
        chatService.deleteForMe(messageId, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Deletes a message for both sender and receiver ("Delete for Everyone").
     */
    @PostMapping("/messages/{messageId}/delete-for-everyone")
    public ResponseEntity<?> deleteForEveryone(
            @PathVariable Long messageId, 
            @RequestParam Long senderId) {
        logger.debug("Deleting message ID: {} for everyone by sender: {}", messageId, senderId);
        chatService.deleteForEveryone(messageId, senderId);
        return ResponseEntity.ok().build();
    }

    /**
     * Marks a "View Once" message as read/destructed once rendered.
     */
    @PostMapping("/messages/{messageId}/view-once-open")
    public ResponseEntity<?> openViewOnce(
            @PathVariable Long messageId, 
            @RequestParam Long userId) {
        logger.debug("Opening View Once message ID: {} by user: {}", messageId, userId);
        chatService.markViewOnceAsViewed(messageId, userId);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/test-error")//to be used for global Exception
    public String testError() {
        throw new RuntimeException("Testing global handler");
    }
}



