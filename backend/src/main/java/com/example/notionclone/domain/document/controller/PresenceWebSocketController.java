package com.example.notionclone.domain.document.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class PresenceWebSocketController {
    private final SimpMessagingTemplate messagingTemplate;
    // 문서별 접속자 목록 (userId -> name)
    private final Map<String, Set<PresenceUser>> documentViewers = new ConcurrentHashMap<>();

    public PresenceWebSocketController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/presence/{documentId}/join")
    public void join(@DestinationVariable String documentId, @Payload PresenceUser user) {
        documentViewers.computeIfAbsent(documentId, k -> ConcurrentHashMap.newKeySet()).add(user);
        broadcast(documentId);
    }

    @MessageMapping("/presence/{documentId}/leave")
    public void leave(@DestinationVariable String documentId, @Payload PresenceUser user) {
        Set<PresenceUser> set = documentViewers.get(documentId);
        if (set != null) {
            set.remove(user);
            if (set.isEmpty()) documentViewers.remove(documentId);
            else broadcast(documentId);
        }
    }

    private void broadcast(String documentId) {
        Set<PresenceUser> set = documentViewers.getOrDefault(documentId, Collections.emptySet());
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "presence");
        msg.put("documentId", documentId);
        msg.put("users", set);
        messagingTemplate.convertAndSend("/topic/presence/" + documentId, msg);
    }

    // PresenceUser DTO (내부 static class)
    public static class PresenceUser {
        public String userId;
        public String name;
        public String email;

        public PresenceUser() {}
        public PresenceUser(String userId, String name, String email) {
            this.userId = userId;
            this.name = name;
            this.email = email;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            PresenceUser that = (PresenceUser) o;
            return Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId);
        }
    }
} 