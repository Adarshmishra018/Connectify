package com.example.demo.Service;

import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

@Service
public class RabbitMQReceiver {

    // Listens to the specified queue and automatically deserializes the JSON to your Entity
    @RabbitListener(queues = RabbitMQConfig.CHAT_QUEUE)
    public void receiveMessage(ChatMessageEntity message) {
        System.out.println("Received message from RabbitMQ: " + message.getMessage());
        
        // TODO: Forward the message to the user's active connection (e.g., via WebSockets)
        // or execute any other processing required.
    }
}
