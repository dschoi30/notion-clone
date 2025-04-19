package com.example.notionclone.domain.document.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateDocumentRequest {
    private String title;
    private String content;
    private Long parentId;
    private String icon;
    private Integer position;
} 