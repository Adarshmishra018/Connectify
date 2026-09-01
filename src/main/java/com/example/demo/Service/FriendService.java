package com.example.demo.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.stereotype.Service;

import com.example.demo.Entity.FriendEntity;
import com.example.demo.Entity.UserEntity;
import com.example.demo.controllers.FriendController;
import com.example.demo.repository.FriendRepository;
import com.example.demo.repository.UserRepository;


@Service
public class FriendService {

	
	private static final Logger logger = LogManager.getLogger(FriendService.class);

    private final FriendRepository friendRepository;
    private final UserRepository userRepository;

    public FriendService(FriendRepository friendRepository,UserRepository userRepository) {//constructor DI
        this.friendRepository = friendRepository;
        this.userRepository = userRepository;
    }
    
    
    
    public List<UserEntity> getFriends(Long userId) {
        List<FriendEntity> friends = friendRepository.findByUserId(userId);// find all list of friends by user id
        List<UserEntity> friendUsers = new ArrayList<>();//
        Set<Long> addedFriendIds = new HashSet<>(); // Tracks already added friends to prevent duplicates
        for (FriendEntity friend : friends) {//iterate every friend
            Long friendId = friend.getFriendId();//get friend Id
            
            // Do not add oneself and do not add duplicates
            if (!friendId.equals(userId) && !addedFriendIds.contains(friendId)) { //
                userRepository.findById(friendId).ifPresent(user -> {
                	friendUsers.add(user);//add new friend in list
                    addedFriendIds.add(friendId);//add new friend id
                });
            }
        }
        return friendUsers;
    }
    
    
    public String addFriend(FriendEntity friend) {
        // 1. Prevent self-adding to oneself
        if (friend.getUserId().equals(friend.getFriendId())) {
            return "You cannot add yourself as a friend.";
        }
        // 2. Prevent duplicate entries i.e one friend twice
        boolean friendshipExists = friendRepository.existsByUserIdAndFriendId(friend.getUserId(), friend.getFriendId());
        if (friendshipExists) {		//if already friend
            return "Friend connection already exists.";
        }
        FriendEntity f1 = new FriendEntity();
        f1.setUserId(friend.getUserId());
        f1.setFriendId(friend.getFriendId());
        FriendEntity f2 = new FriendEntity();
        f2.setUserId(friend.getFriendId());
        f2.setFriendId(friend.getUserId());
        friendRepository.save(f1);
        friendRepository.save(f2);
        return "Friend added successfully";
    }

}