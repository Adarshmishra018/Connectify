package com.example.demo.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.Entity.ChatMessageEntity.MessageStatus;
import com.example.demo.repository.ChatMessageRepository;
import com.example.demo.repository.UserRepository;

@Service // Creates bean automatically
public class ChatService {

    private static final Logger logger = LogManager.getLogger(ChatService.class);

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

    // ==========================================
    // Existing Chat Service Methods
    // ==========================================

    // Mark messages sent by friendId to userId as READ
    public void markMessagesAsRead(Long userId, Long friendId) {
        List<ChatMessageEntity> unreadMessages = chatRepository.findBySenderIdAndReceiverIdAndStatusNot(
                friendId, userId, MessageStatus.READ
        );
        for (ChatMessageEntity msg : unreadMessages) {
            msg.setStatus(MessageStatus.READ);
        }
        chatRepository.saveAll(unreadMessages);
    }

    // Mark messages sent to userId as DELIVERED
    public void markMessagesAsDelivered(Long userId) {
        List<ChatMessageEntity> sentMessages = chatRepository.findByReceiverIdAndStatus(
                userId, MessageStatus.SENT
        );
        for (ChatMessageEntity msg : sentMessages) {
            msg.setStatus(MessageStatus.DELIVERED);
        }
        chatRepository.saveAll(sentMessages);
    }

    // Send a message
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

    // Fetch full chat history
    public List<ChatMessageEntity> getChatMessages(Long senderId, Long receiverId) {
        List<ChatMessageEntity> messages = chatRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(
                senderId, receiverId, senderId, receiverId
        );
        // Apply edit/delete/view-once filtering (assuming senderId is the requesting user)
        return filterAndMaskMessages(messages, senderId);
    }

    // Fetch chat history paginated
    public List<ChatMessageEntity> getChatMessagesPaginated(Long senderId, Long receiverId, int page, int size) {
        org.springframework.data.domain.Pageable pageable = 
            org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("sentAt").descending());
        
        org.springframework.data.domain.Page<ChatMessageEntity> messagePage = 
            chatRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(
                senderId, receiverId, senderId, receiverId, pageable
            );
            
        // Apply edit/delete/view-once filtering (assuming senderId is the requesting user)
        return filterAndMaskMessages(messagePage.getContent(), senderId);
    }

    // Fetch inbox list
    public List<ChatMessageEntity> getInbox(Long userId) {
        List<ChatMessageEntity> messages = chatRepository.findByReceiverId(userId);
        // Exclude messages deleted by the receiver
        return messages.stream()
                .filter(msg -> !msg.isDeletedByReceiver())
                .collect(Collectors.toList());
    }

    // ==========================================
    // New Feature Methods (Edit/Delete/View Once)
    // ==========================================

    // Edit message content
    public ChatMessageEntity editMessage(Long messageId, Long senderId, String newText) {
        ChatMessageEntity msg = chatRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!msg.getSenderId().equals(senderId)) {
            throw new SecurityException("You can only edit your own messages");
        }

        msg.setMessage(newText);
        msg.setEdited(true);
        msg.setEditedAt(LocalDateTime.now());
        return chatRepository.save(msg);
    }

    // Delete message for me
    public void deleteForMe(Long messageId, Long userId) {
        ChatMessageEntity msg = chatRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (msg.getSenderId().equals(userId)) {
            msg.setDeletedBySender(true);
        } else if (msg.getReceiverId().equals(userId)) {
            msg.setDeletedByReceiver(true);
        }
        
        // If both sides deleted it for themselves, delete it physically from database
        if (msg.isDeletedBySender() && msg.isDeletedByReceiver()) {
            chatRepository.delete(msg);
        } else {
            chatRepository.save(msg);
        }
    }

    // Delete message for everyone
    public void deleteForEveryone(Long messageId, Long senderId) {
        ChatMessageEntity msg = chatRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!msg.getSenderId().equals(senderId)) {
            throw new SecurityException("You can only delete messages you sent");
        }

        msg.setDeletedForEveryone(true);
        msg.setMessage("This message was deleted"); // Redact original content
        chatRepository.save(msg);
    }

    // Mark a "View Once" message as expired
    public void markViewOnceAsViewed(Long messageId, Long receiverId) {
        ChatMessageEntity msg = chatRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (msg.getReceiverId().equals(receiverId) && msg.isViewOnce() && !msg.isViewed()) {
            msg.setViewed(true);
            msg.setMessage("[Opened View Once Message]"); // Redact payload from DB for security
            chatRepository.save(msg);
        }
    }

    // Helper filter to filter out hidden/view-once messages and mask deleted messages
    private List<ChatMessageEntity> filterAndMaskMessages(List<ChatMessageEntity> messages, Long currentUserId) {
        return messages.stream()
            .filter(msg -> {
                // 1. Filter out if the current user deleted this message for themselves
                if (msg.getSenderId().equals(currentUserId) && msg.isDeletedBySender()) return false;
                if (msg.getReceiverId().equals(currentUserId) && msg.isDeletedByReceiver()) return false;
                
                // 2. Filter out View Once messages that have already been opened
                if (msg.isViewOnce() && msg.isViewed()) return false;
                
                return true;
            })
            .peek(msg -> {
                // 3. If a message is deleted for everyone, mask its contents
                if (msg.isDeletedForEveryone()) {
                    msg.setMessage("This message was deleted");
                }
            })
            .collect(Collectors.toList());
    }
}
















//package com.example.demo.Service;
//
//import java.time.LocalDateTime;
//import java.util.List;
//
//import org.apache.logging.log4j.LogManager;
//import org.apache.logging.log4j.Logger;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//import com.example.demo.Entity.ChatMessageEntity;
//import com.example.demo.Entity.ChatMessageEntity.MessageStatus;
//import com.example.demo.controllers.FriendController;
//import com.example.demo.repository.ChatMessageRepository;
//import com.example.demo.repository.UserRepository;
//
//@Service			//creates bean automatically
//public class ChatService {
//
//	
//	private static final Logger logger = LogManager.getLogger(ChatService.class);
//
//	// Inject NotificationService and UserRepository inside ChatService:
//	
//    private final NotificationService notificationService;
//	
//    private final UserRepository userRepository;
//	
//    private final ChatMessageRepository chatRepository;
//
//   
//    
// 
//    public ChatService(NotificationService notificationService, UserRepository userRepository,
//			ChatMessageRepository chatRepository) {
//		super();
//		this.notificationService = notificationService;
//		this.userRepository = userRepository;
//		this.chatRepository = chatRepository;
//	}
//
//    
// // Mark messages sent by friendId to userId as READ
//    public void markMessagesAsRead(Long userId, Long friendId) {
//        List<ChatMessageEntity> unreadMessages = chatRepository.findBySenderIdAndReceiverIdAndStatusNot(
//                friendId, userId, MessageStatus.READ
//        );
//        for (ChatMessageEntity msg : unreadMessages) {
//            msg.setStatus(MessageStatus.READ);
//        }
//        chatRepository.saveAll(unreadMessages);
//        // Clear Redis cache so changes are synced instantly
//       // evictCache(userId, friendId);
//    }
//    // Mark messages sent to userId as DELIVERED
//    public void markMessagesAsDelivered(Long userId) {
//        List<ChatMessageEntity> sentMessages = chatRepository.findByReceiverIdAndStatus(
//                userId, MessageStatus.SENT
//        );
//        for (ChatMessageEntity msg : sentMessages) {
//            msg.setStatus(MessageStatus.DELIVERED);
//            // Evict cache for each thread
//           // evictCache(msg.getSenderId(), msg.getReceiverId());
//        }
//        chatRepository.saveAll(sentMessages);
//    }
//    
//    
//    
//
//	public ChatMessageEntity sendMessage(ChatMessageEntity chatMessage) {
//        chatMessage.setSentAt(LocalDateTime.now());
//        ChatMessageEntity savedMessage = chatRepository.save(chatMessage);
//
//        // Get sender name to render on user screen
//        String senderName = userRepository.findById(chatMessage.getSenderId())
//                                          .map(user -> user.getName())
//                                          .orElse("Connectify User");
//
//        try {
//            notificationService.sendPushNotification(
//                chatMessage.getReceiverId(),
//                "New Message from " + senderName,
//                chatMessage.getMessage()
//            );
//        } catch(Exception e) {
//            logger.error("Could not trigger FCM push notification to target user.", e);
//        }
//
//        return savedMessage;
//    }
//
//    
////    public ChatMessageEntity sendMessage(ChatMessageEntity chatMessage) {
////        chatMessage.setSentAt(LocalDateTime.now());//Adds current time.
////        return chatRepository.save(chatMessage);//methos of JPArepository that saves in DB an returns saved entity.
////    }
//
//    
//    
//    
//  public List<ChatMessageEntity> getChatMessages(Long senderId, Long receiverId) {//JPA converts each row into a ChatMessageEntity object and puts them into a List.
//       return chatRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(	//fetches Both sides of conversation and return lists of objects
//               senderId,
//               receiverId,
//                senderId,
//               receiverId
//        );
//    }
//	public List<ChatMessageEntity> getChatMessagesPaginated(Long senderId, Long receiverId, int page, int size) {
//	    org.springframework.data.domain.Pageable pageable = 
//	        org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("sentAt").descending());
//	    
//	    org.springframework.data.domain.Page<ChatMessageEntity> messagePage = 
//	        chatRepository.findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(
//	            senderId, receiverId, senderId, receiverId, pageable
//	        );
//	        
//	    return messagePage.getContent();
//	}
//    
//    
//    public List<ChatMessageEntity> getInbox(Long userId) {//fetch from DB & return list of objects
//
//        return chatRepository.findByReceiverId(userId);//
//    }
//}