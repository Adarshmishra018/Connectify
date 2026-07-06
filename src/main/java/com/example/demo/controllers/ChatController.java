package com.example.demo.controllers;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.Service.ChatService;




@RestController
@RequestMapping("/api/auth") // Corrected from '/api/auth'
public class ChatController {
    private static final Logger logger = LogManager.getLogger(ChatController.class);
    private final ChatService chatService;
    // Constructor Injection
    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }
    /**
     * Sends a chat message.
     * Recommendation: Swap ChatMessageEntity with ChatMessageDto.
     */
    @PostMapping("/send")
    public ResponseEntity<ChatMessageEntity> sendMessage(@RequestBody ChatMessageEntity chatMessage) {
        logger.debug("Processing request to send message from sender: {}", chatMessage.getSenderId());
        ChatMessageEntity responseEntity = chatService.sendMessage(chatMessage);
        return ResponseEntity.status(HttpStatus.CREATED).body(responseEntity);
    }
    /**
     * Fetches chat history between sender and receiver.
     */
//    @GetMapping("/messages")
//    public ResponseEntity<List<ChatMessageEntity>> getChatMessages(
//            @RequestParam Long senderId,
//            @RequestParam Long receiverId) {
//        logger.debug("Fetching chat messages between sender {} and receiver {}", senderId, receiverId);
//        List<ChatMessageEntity> messages = chatService.getChatMessages(senderId, receiverId);
//        return ResponseEntity.ok(messages);
//    }
    
    
    
    @GetMapping("/messages")
    public ResponseEntity<List<ChatMessageEntity>> getChatMessages(
            @RequestParam Long senderId,
            @RequestParam Long receiverId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
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
    
    @PostMapping("/messages/read")
    public ResponseEntity<?> markAsRead(@RequestParam Long userId, @RequestParam Long friendId) {
        chatService.markMessagesAsRead(userId, friendId);
        return ResponseEntity.ok().build();
    }
    @PostMapping("/messages/deliver")
    public ResponseEntity<?> markAsDelivered(@RequestParam Long userId) {
        chatService.markMessagesAsDelivered(userId);
        return ResponseEntity.ok().build();
    }
    
    
}

//@RestController
//@RequestMapping("/api/auth")
//public class ChatController {
//
//	
//	private static final Logger logger = LogManager.getLogger(ChatController.class);
//	
//
//	    private final ChatService chatService;//Service Obj
//
//	    public ChatController(ChatService chatService) {//Di by constructor
//	        this.chatService = chatService;
//	    }
//	   
//
//	    
//	    @PostMapping("/send")
//	    public ChatMessageEntity sendMessage(@RequestBody ChatMessageEntity chatMessage) {//Reads data from Json request body,
//	    	logger.debug("Inside Chat Controller");
//	        return chatService.sendMessage(chatMessage);//recieves entity type and controller returns it as JSON
//	    }
//
//	    @GetMapping("/messages")		//GET /chat/messages?senderId=1&receiverId=2
//	    public List<ChatMessageEntity> getChatMessages( @RequestParam Long senderId, @RequestParam Long receiverId) {//Reads Query parameter
//	        return chatService.getChatMessages(senderId, receiverId);//returns list of objects fetched from DB
//	    }
//
//	    @GetMapping("/inbox/{userId}")
//	    public List<ChatMessageEntity> getInbox(@PathVariable Long userId) {//extracts userId from url
//	        return chatService.getInbox(userId);//returns list of objects
//	    }
//	
//
//}
