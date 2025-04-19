package com.example.notionclone.domain.document.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateDocumentRequest {
    private String title;
    private String content;
    private Long parentId;
    private boolean isFolder;
    private String icon;
    private Integer position;
} 