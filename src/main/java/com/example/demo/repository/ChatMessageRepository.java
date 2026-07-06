package com.example.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.Entity.ChatMessageEntity.MessageStatus;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {
	

	//Spring Data JPA generates SQL,Repository returns Saved Entity,Controller returns it as JSON.
	
	org.springframework.data.domain.Page<ChatMessageEntity> findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(
	        Long senderId,
	        Long receiverId,
	        Long receiverId2,
	        Long senderId2,
	        org.springframework.data.domain.Pageable pageable
	);
	    List<ChatMessageEntity> findBySenderIdAndReceiverIdOrReceiverIdAndSenderId(//fetches data from DB saves into entity and return list of objects
	            Long senderId,
	            Long receiverId,
	            Long receiverId2,
	            Long senderId2
	    );

	    List<ChatMessageEntity> findByReceiverId(Long receiverId);//fetch Data from DB and returns list of objects

	    
	    List<ChatMessageEntity> findBySenderIdAndReceiverIdAndStatusNot(Long senderId, Long receiverId, MessageStatus status);
	    List<ChatMessageEntity> findByReceiverIdAndStatus(Long receiverId, MessageStatus status);
}
