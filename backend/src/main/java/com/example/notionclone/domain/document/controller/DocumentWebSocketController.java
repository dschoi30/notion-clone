package com.example.notionclone.domain.document.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

// 실시간 협업용 WebSocket 메시지 핸들러
@Controller
public class DocumentWebSocketController {

    // 클라이언트가 /app/document/{documentId}/edit로 메시지 전송 시
    // 같은 문서의 모든 구독자에게 /topic/document/{documentId}로 브로드캐스트
    @MessageMapping("/document/{documentId}/edit")
    @SendTo("/topic/document/{documentId}")
    public String handleEdit(@Payload String message) {
        // 실제로는 DTO로 파싱/검증 후 브로드캐스트
        System.out.println("Received message: " + message);
        return message;
    }
}
