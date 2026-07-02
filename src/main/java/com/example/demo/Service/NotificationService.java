package com.example.demo.Service;

import com.example.demo.Entity.UserDeviceTokenEntity;
import com.example.demo.repository.UserDeviceTokenRepository;
import com.google.firebase.messaging.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final UserDeviceTokenRepository tokenRepository;

    public NotificationService(UserDeviceTokenRepository tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    public void registerToken(Long userId, String token) {
        tokenRepository.findByFcmToken(token).ifPresentOrElse(
            existing -> {
                existing.setUserId(userId);
                tokenRepository.save(existing);
            },
            () -> tokenRepository.save(new UserDeviceTokenEntity(userId, token))
        );
    }

    public void sendPushNotification(Long recipientId, String title, String body) {
        List<UserDeviceTokenEntity> tokens = tokenRepository.findByUserId(recipientId);

        for (UserDeviceTokenEntity deviceToken : tokens) {
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message message = Message.builder()
                    .setToken(deviceToken.getFcmToken())
                    .setNotification(notification)
                    .putData("click_action", "/chat.html")
                    .build();

            try {
                FirebaseMessaging.getInstance().send(message);
            } catch (FirebaseMessagingException e) {
                if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED) {
                    tokenRepository.delete(deviceToken);
                }
            }
        }
    }
}

