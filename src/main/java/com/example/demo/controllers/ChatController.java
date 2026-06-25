package com.example.demo.controllers;


import org.springframework.web.bind.annotation.*;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.Service.ChatService;


import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class ChatController {

	
	private static final Logger logger = LogManager.getLogger(ChatController.class);
	

	    private final ChatService chatService;//Service Obj

	    public ChatController(ChatService chatService) {//Di by constructor
	        this.chatService = chatService;
	    }
	   

	    
	    @PostMapping("/send")
	    public ChatMessageEntity sendMessage(@RequestBody ChatMessageEntity chatMessage) {//Reads data from Json request body,
	    	logger.debug("Inside Chat Controller");
	        return chatService.sendMessage(chatMessage);//recieves entity type and controller returns it as JSON
	    }

	    @GetMapping("/messages")		//GET /chat/messages?senderId=1&receiverId=2
	    public List<ChatMessageEntity> getChatMessages( @RequestParam Long senderId, @RequestParam Long receiverId) {//Reads Query parameter
	        return chatService.getChatMessages(senderId, receiverId);//returns list of objects fetched from DB
	    }

	    @GetMapping("/inbox/{userId}")
	    public List<ChatMessageEntity> getInbox(@PathVariable Long userId) {//extracts userId from url
	        return chatService.getInbox(userId);//returns list of objects
	    }
	

}
