package com.example.notionclone.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.notionclone.security.JwtTokenProvider;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/document")
            .setAllowedOriginPatterns("*")
            .addInterceptors(new JwtHandshakeInterceptor(jwtTokenProvider))
            .withSockJS();
        registry.addEndpoint("/ws/presence")
            .setAllowedOriginPatterns("*")
            .addInterceptors(new JwtHandshakeInterceptor(jwtTokenProvider))
            .withSockJS();
    }
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }
}
