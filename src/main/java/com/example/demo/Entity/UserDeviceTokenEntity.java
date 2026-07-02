package com.example.demo.Entity;


import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_device_token")
public class UserDeviceTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    @Column(nullable = false, unique = true)
    private String fcmToken;

    private LocalDateTime updatedAt = LocalDateTime.now();

    public UserDeviceTokenEntity() {}

    public UserDeviceTokenEntity(Long userId, String fcmToken) {
        this.userId = userId;
        this.fcmToken = fcmToken;
        this.updatedAt = LocalDateTime.now();
    }

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getUserId() {
		return userId;
	}

	public void setUserId(Long userId) {
		this.userId = userId;
	}

	public String getFcmToken() {
		return fcmToken;
	}

	public void setFcmToken(String fcmToken) {
		this.fcmToken = fcmToken;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}

	@Override
	public String toString() {
		return "UserDeviceTokenEntity [id=" + id + ", userId=" + userId + ", fcmToken=" + fcmToken + ", updatedAt="
				+ updatedAt + "]";
	}


    // Getters and Setters here\\
    
    
}
