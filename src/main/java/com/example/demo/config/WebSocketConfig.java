package com.example.demo.config;

import com.example.demo.handler.SignallingHandler;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SignallingHandler signalingHandler;

    public WebSocketConfig(SignallingHandler signalingHandler) {
        this.signalingHandler = signalingHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Register signaling endpoint and allow cross-origin requests
        registry.addHandler(signalingHandler, "/signal").setAllowedOrigins("*");
    }
}
