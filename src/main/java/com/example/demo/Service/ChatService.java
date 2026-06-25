package com.example.demo.Service;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.controllers.FriendController;
import com.example.demo.repository.ChatMessageRepository;

@Service			//creates bean automatically
public class ChatService {

	
	private static final Logger logger = LogManager.getLogger(ChatService.class);

    private final ChatMessageRepository chatRepository;

    public ChatService(ChatMessageRepository chatRepository) {		//injects repository bean by constructor DI
        this.chatRepository = chatRepository;
    }

    
    
    
    public ChatMessageEntity sendMessage(ChatMessageEntity chatMessage) {
        chatMessage.setSentAt(LocalDateTime.now());//Adds current time.
        return chatRepository.save(chatMessage);//methos of JPArepository that saves in DB an returns saved entity.
    }

    
    
    
    public List<ChatMessageEntity> getChatMessages(Long senderId, Long receiverId) {//JPA converts each row into a ChatMessageEntity object and puts them into a List.
        return chatRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(	//fetches Both sides of conversation and return lists of objects
                senderId,
                receiverId,
                senderId,
                receiverId
        );
    }

    
    
    public List<ChatMessageEntity> getInbox(Long userId) {//fetch from DB & return list of objects

        return chatRepository.findByReceiverId(userId);//
    }
}