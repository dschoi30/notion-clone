package com.example.notionclone.domain.document.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.example.notionclone.domain.document.entity.Document;

@Getter
@NoArgsConstructor
public class DocumentResponse {
    private Long id;
    private String title;
    private String content;
    private Long workspaceId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DocumentResponse from(Document document) {
        DocumentResponse response = new DocumentResponse();
        response.id = document.getId();
        response.title = document.getTitle();
        response.content = document.getContent();
        response.workspaceId = document.getWorkspace() != null ? document.getWorkspace().getId() : null;
        response.createdAt = document.getCreatedAt();
        response.updatedAt = document.getUpdatedAt();
        return response;
    }
} 