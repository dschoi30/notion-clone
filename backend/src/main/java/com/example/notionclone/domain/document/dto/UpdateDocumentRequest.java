package com.example.notionclone.domain.document.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateDocumentRequest {
    private String title;
    private String content;
    private Long workspaceId;
    private Long parentId;
    private String viewType;
} 