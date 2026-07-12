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

	 // --- New Fields inside ChatMessageEntity ---

	    private boolean deletedBySender = false;    // For "Delete for Me" (Sender)
	    private boolean deletedByReceiver = false;  // For "Delete for Me" (Receiver)
	    private boolean deletedForEveryone = false; // For "Delete for Everyone"

	    private boolean isEdited = false;           // Tracks if message was edited
	    private LocalDateTime editedAt;             // Tracks when it was edited

	    private boolean viewOnce = false;           // For "View Once / Self-Destruct"
	    private boolean viewed = false;             // Tracks if the receiver has viewed it

	    // --- Getters & Setters ---

	    public boolean isDeletedBySender() { return deletedBySender; }
	    public void setDeletedBySender(boolean deletedBySender) { this.deletedBySender = deletedBySender; }

	    public boolean isDeletedByReceiver() { return deletedByReceiver; }
	    public void setDeletedByReceiver(boolean deletedByReceiver) { this.deletedByReceiver = deletedByReceiver; }

	    public boolean isDeletedForEveryone() { return deletedForEveryone; }
	    public void setDeletedForEveryone(boolean deletedForEveryone) { this.deletedForEveryone = deletedForEveryone; }

	    public boolean isEdited() { return isEdited; }
	    public void setEdited(boolean edited) { isEdited = edited; }

	    public LocalDateTime getEditedAt() { return editedAt; }
	    public void setEditedAt(LocalDateTime editedAt) { this.editedAt = editedAt; }

	    public boolean isViewOnce() { return viewOnce; }
	    public void setViewOnce(boolean viewOnce) { this.viewOnce = viewOnce; }

	    public boolean isViewed() { return viewed; }
	    public void setViewed(boolean viewed) { this.viewed = viewed; }


	    
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
