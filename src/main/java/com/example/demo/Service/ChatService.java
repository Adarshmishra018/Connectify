package com.example.demo.Service;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.Entity.ChatMessageEntity.MessageStatus;
import com.example.demo.controllers.FriendController;
import com.example.demo.repository.ChatMessageRepository;
import com.example.demo.repository.UserRepository;

@Service			//creates bean automatically
public class ChatService {

	
	private static final Logger logger = LogManager.getLogger(ChatService.class);

	// Inject NotificationService and UserRepository inside ChatService:
	
    private final NotificationService notificationService;
	
    private final UserRepository userRepository;
	
    private final ChatMessageRepository chatRepository;

   
    
 
    public ChatService(NotificationService notificationService, UserRepository userRepository,
			ChatMessageRepository chatRepository) {
		super();
		this.notificationService = notificationService;
		this.userRepository = userRepository;
		this.chatRepository = chatRepository;
	}

    
 // Mark messages sent by friendId to userId as READ
    public void markMessagesAsRead(Long userId, Long friendId) {
        List<ChatMessageEntity> unreadMessages = chatRepository.findBySenderIdAndReceiverIdAndStatusNot(
                friendId, userId, MessageStatus.READ
        );
        for (ChatMessageEntity msg : unreadMessages) {
            msg.setStatus(MessageStatus.READ);
        }
        chatRepository.saveAll(unreadMessages);
        // Clear Redis cache so changes are synced instantly
       // evictCache(userId, friendId);
    }
    // Mark messages sent to userId as DELIVERED
    public void markMessagesAsDelivered(Long userId) {
        List<ChatMessageEntity> sentMessages = chatRepository.findByReceiverIdAndStatus(
                userId, MessageStatus.SENT
        );
        for (ChatMessageEntity msg : sentMessages) {
            msg.setStatus(MessageStatus.DELIVERED);
            // Evict cache for each thread
           // evictCache(msg.getSenderId(), msg.getReceiverId());
        }
        chatRepository.saveAll(sentMessages);
    }
    
    
    

	public ChatMessageEntity sendMessage(ChatMessageEntity chatMessage) {
        chatMessage.setSentAt(LocalDateTime.now());
        ChatMessageEntity savedMessage = chatRepository.save(chatMessage);

        // Get sender name to render on user screen
        String senderName = userRepository.findById(chatMessage.getSenderId())
                                          .map(user -> user.getName())
                                          .orElse("Connectify User");

        try {
            notificationService.sendPushNotification(
                chatMessage.getReceiverId(),
                "New Message from " + senderName,
                chatMessage.getMessage()
            );
        } catch(Exception e) {
            logger.error("Could not trigger FCM push notification to target user.", e);
        }

        return savedMessage;
    }

    
//    public ChatMessageEntity sendMessage(ChatMessageEntity chatMessage) {
//        chatMessage.setSentAt(LocalDateTime.now());//Adds current time.
//        return chatRepository.save(chatMessage);//methos of JPArepository that saves in DB an returns saved entity.
//    }

    
    
    
  public List<ChatMessageEntity> getChatMessages(Long senderId, Long receiverId) {//JPA converts each row into a ChatMessageEntity object and puts them into a List.
       return chatRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(	//fetches Both sides of conversation and return lists of objects
               senderId,
               receiverId,
                senderId,
               receiverId
        );
    }
	public List<ChatMessageEntity> getChatMessagesPaginated(Long senderId, Long receiverId, int page, int size) {
	    org.springframework.data.domain.Pageable pageable = 
	        org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("sentAt").descending());
	    
	    org.springframework.data.domain.Page<ChatMessageEntity> messagePage = 
	        chatRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(
	            senderId, receiverId, senderId, receiverId, pageable
	        );
	        
	    return messagePage.getContent();
	}
    
    
    public List<ChatMessageEntity> getInbox(Long userId) {//fetch from DB & return list of objects

        return chatRepository.findByReceiverId(userId);//
    }
}