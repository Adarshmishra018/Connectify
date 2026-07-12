package com.example.demo.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.Entity.UserEntity;
import com.example.demo.Entity.UserLocationEntity;
import com.example.demo.Entity.NearbyUserDto;
import com.example.demo.Entity.PokeMessageEntity;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.FriendRepository;
import com.example.demo.repository.UserLocationRepository;
import com.example.demo.repository.PokeMessageRepository;

import java.util.*;

@RestController
@RequestMapping("/api/auth/nearby-poke")
public class NearByController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendRepository friendRepository;

    @Autowired
    private UserLocationRepository userLocationRepository;

    @Autowired
    private PokeMessageRepository pokeMessageRepository;

    // Update location of the user
    @PostMapping("/location")
    public ResponseEntity<?> updateLocation(
            @RequestParam Long userId,
            @RequestParam Double latitude,
            @RequestParam Double longitude) {
        
        UserLocationEntity location = userLocationRepository.findByUserId(userId)
                .orElse(new UserLocationEntity(userId, latitude, longitude));
        
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        userLocationRepository.save(location);
        
        return ResponseEntity.ok(Map.of("message", "Location updated successfully"));
    }

    // Get all users within 200 meters using Haversine calculation
    @GetMapping("/users")
    public ResponseEntity<List<NearbyUserDto>> getNearbyUsers(@RequestParam Long userId) {
        UserLocationEntity currentUserLoc = userLocationRepository.findByUserId(userId).orElse(null);
        if (currentUserLoc == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        double lat1 = currentUserLoc.getLatitude();
        double lon1 = currentUserLoc.getLongitude();

        List<UserEntity> allUsers = userRepository.findAll();
        List<NearbyUserDto> nearbyUsers = new ArrayList<>();

        for (UserEntity user : allUsers) {
            if (user.getId().equals(userId)) continue;

            UserLocationEntity loc = userLocationRepository.findByUserId(user.getId()).orElse(null);
            if (loc == null) continue;

            double distance = calculateDistance(lat1, lon1, loc.getLatitude(), loc.getLongitude());
            if (distance <= 200) { // 200m threshold
                boolean isFriend = friendRepository.existsByUserIdAndFriendId(userId, user.getId());
                nearbyUsers.add(new NearbyUserDto(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    distance,
                    isFriend
                ));
            }
        }
        return ResponseEntity.ok(nearbyUsers);
    }

    // Poke user with validation constraints
    @PostMapping("/poke")
    public ResponseEntity<?> pokeUser(
            @RequestParam Long senderId,
            @RequestParam Long receiverId,
            @RequestParam String message) {

        // Rule 1: Dislike messages cannot send messages again
        boolean isDisliked = pokeMessageRepository.existsBySenderIdAndReceiverIdAndReaction(senderId, receiverId, "DISLIKE");
        if (isDisliked) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("You cannot send messages to this user because they disliked a previous message.");
        }

        // Rule 2: Poke button option allows to send only one message until reacted
        Optional<PokeMessageEntity> lastPokeOpt = pokeMessageRepository.findTopBySenderIdAndReceiverIdOrderBySentAtDesc(senderId, receiverId);
        if (lastPokeOpt.isPresent()) {
            PokeMessageEntity lastPoke = lastPokeOpt.get();
            if (lastPoke.getReaction() == null) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("You have already poked this user. Wait for their reaction before poking again.");
            }
        }

        PokeMessageEntity poke = new PokeMessageEntity(senderId, receiverId, message);
        pokeMessageRepository.save(poke);
        return ResponseEntity.ok(poke);
    }

    // React to received poke
    @PostMapping("/react")
    public ResponseEntity<?> reactToPoke(
            @RequestParam Long pokeId,
            @RequestParam String reaction) {
        
        PokeMessageEntity poke = pokeMessageRepository.findById(pokeId).orElse(null);
        if (poke == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Poke message not found");
        }

        poke.setReaction(reaction);
        pokeMessageRepository.save(poke);
        return ResponseEntity.ok(poke);
    }

    // Fetch received pokes list
    @GetMapping("/pokes/received")
    public ResponseEntity<List<Map<String, Object>>> getReceivedPokes(@RequestParam Long userId) {
        List<PokeMessageEntity> pokes = pokeMessageRepository.findByReceiverId(userId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (PokeMessageEntity poke : pokes) {
            UserEntity sender = userRepository.findById(poke.getSenderId()).orElse(null);
            String senderName = sender != null ? sender.getName() : "Unknown User";

            Map<String, Object> map = new HashMap<>();
            map.put("id", poke.getId());
            map.put("senderId", poke.getSenderId());
            map.put("senderName", senderName);
            map.put("message", poke.getMessage());
            map.put("sentAt", poke.getSentAt());
            map.put("reaction", poke.getReaction());
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371000; // Radius in meters
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
