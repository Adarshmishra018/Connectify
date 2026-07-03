package com.example.demo.Entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class ChatMessageEntity {
//id,senderId,receiverId,message,sentAt

	    @Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    private Long id;

	    private Long senderId;
	    private Long receiverId;

	    @Column(length = 2000) // Encrypted text is slightly longer
	    @jakarta.persistence.Convert(converter = E2eeMessageConverter.class)
	    private String message;


	    private LocalDateTime sentAt;



	    
	 // Define Message Status Enum
	    public enum MessageStatus {
	        SENT, DELIVERED, READ
	    }
	    // Add this field inside ChatMessageEntity:
	    @Enumerated(EnumType.STRING)
	    private MessageStatus status = MessageStatus.SENT;
	    // Add Getter & Setter:
	    public MessageStatus getStatus() {
	        return status;
	    }
	    public void setStatus(MessageStatus status) {
	        this.status = status;
	    }
	    
	    
	    
	    public ChatMessageEntity() {}

	    public ChatMessageEntity(Long senderId, Long receiverId, String message) {
	        this.senderId = senderId;
	        this.receiverId = receiverId;
	        this.message = message;
	        this.sentAt = LocalDateTime.now();
	    }

		public Long getId() {
			return id;
		}

		public void setId(Long id) {
			this.id = id;
		}

		public Long getSenderId() {
			return senderId;
		}

		public void setSenderId(Long senderId) {
			this.senderId = senderId;
		}

		public Long getReceiverId() {
			return receiverId;
		}

		public void setReceiverId(Long receiverId) {
			this.receiverId = receiverId;
		}

		public String getMessage() {
			return message;
		}

		public void setMessage(String message) {
			this.message = message;
		}

		public LocalDateTime getSentAt() {
			return sentAt;
		}

		public void setSentAt(LocalDateTime sentAt) {
			this.sentAt = sentAt;
		}

		@Override
		public String toString() {
			return "ChatMessageEntity [id=" + id + ", senderId=" + senderId + ", receiverId=" + receiverId
					+ ", message=" + message + ", sentAt=" + sentAt + "]";
		}
	 
		
	    
}
