package com.example.demo.repository;

import com.example.demo.Entity.UserDeviceTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceTokenEntity, Long> {
    
    /**
     * Find all registered device tokens for a specific user.
     */
    List<UserDeviceTokenEntity> findByUserId(Long userId);
    
    /**
     * Find a device registration by its unique FCM token.
     */
    Optional<UserDeviceTokenEntity> findByFcmToken(String fcmToken);
}
