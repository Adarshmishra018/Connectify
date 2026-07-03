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
        List<FriendEntity> friends = friendRepository.findByUserId(userId);
        List<UserEntity> friendUsers = new ArrayList<>();
        Set<Long> addedFriendIds = new HashSet<>(); // Tracks already added friends to prevent duplicates
        for (FriendEntity friend : friends) {
            Long friendId = friend.getFriendId();
            
            // Do not add oneself and do not add duplicates
            if (!friendId.equals(userId) && !addedFriendIds.contains(friendId)) {
                userRepository.findById(friendId).ifPresent(user -> {
                    friendUsers.add(user);
                    addedFriendIds.add(friendId);
                });
            }
        }
        return friendUsers;
    }
    public String addFriend(FriendEntity friend) {
        // 1. Prevent self-adding
        if (friend.getUserId().equals(friend.getFriendId())) {
            return "You cannot add yourself as a friend.";
        }
        // 2. Prevent duplicate entries
        boolean friendshipExists = friendRepository.existsByUserIdAndFriendId(friend.getUserId(), friend.getFriendId());
        if (friendshipExists) {
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
    
    
    
    

//    public List<UserEntity> getFriends(Long userId) {//returns list of friends
//        List<FriendEntity> friends = friendRepository.findByUserId(userId);//get friends of userId
//        List<UserEntity> friendUsers = new ArrayList<>();//to store the actual friends details.
//
//        for (FriendEntity friend : friends) {//loop in all friends
//            userRepository.findById(friend.getFriendId())//find friends details from user tbale by friend id and add in list friendUsers
//                    .ifPresent(friendUsers::add);
//        }
//
//        return friendUsers;//returns list of details of friend
//    }
//
//    public String addFriend(FriendEntity friend) {
//
//        FriendEntity f1 = new FriendEntity();//Create first friend record.
//        f1.setUserId(friend.getUserId());//make User 1 → Friend 2
//        f1.setFriendId(friend.getFriendId());
//
//        FriendEntity f2 = new FriendEntity();//Create second friend record.
//        f2.setUserId(friend.getFriendId());//make User 2 → Friend 1
//        f2.setFriendId(friend.getUserId());
//
//        friendRepository.save(f1);//save user 1 which maps to  Friend 2 in FriendEntity
//        friendRepository.save(f2);//save user 2 which maps to  Friend 1 in FriendEntity
//
//        return "Friend added successfully";
//    }
}