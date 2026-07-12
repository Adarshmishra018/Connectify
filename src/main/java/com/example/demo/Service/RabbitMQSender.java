package com.example.demo.Service;

import com.example.demo.Entity.ChatMessageEntity;
import com.example.demo.config.RabbitMQConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class RabbitMQSender {

    private final RabbitTemplate rabbitTemplate;

    public RabbitMQSender(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void sendChatMessage(ChatMessageEntity message) {
        // Automatically serializes ChatMessageEntity object to JSON and publishes it
        rabbitTemplate.convertAndSend(
            RabbitMQConfig.CHAT_EXCHANGE, 
            RabbitMQConfig.CHAT_ROUTING_KEY, 
            message
        );
        System.out.println("Published message to RabbitMQ: " + message.getMessage());
    }
}
