package com.example.demo.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "friend_entity")
public class FriendEntity {
	//id,userId,friendId
	

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long friendId;

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getFriendId() {
        return friendId;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setFriendId(Long friendId) {
        this.friendId = friendId;
    }
}