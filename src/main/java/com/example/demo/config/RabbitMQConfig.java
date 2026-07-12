package com.example.demo.config;


import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String CHAT_EXCHANGE = "chat.exchange";
    public static final String CHAT_QUEUE = "chat.queue";
    public static final String CHAT_ROUTING_KEY = "chat.routingKey";

    // 1. Define the Exchange
    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(CHAT_EXCHANGE);
    }

    // 2. Define the Queue
    @Bean
    public Queue queue() {
        return new Queue(CHAT_QUEUE, true); // durable queue
    }

    // 3. Bind Queue to Exchange with a routing key
    @Bean
    public Binding binding(Queue queue, TopicExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(CHAT_ROUTING_KEY);
    }

    // 4. Configure Jackson serializer so you can publish Java Objects directly as JSON
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
