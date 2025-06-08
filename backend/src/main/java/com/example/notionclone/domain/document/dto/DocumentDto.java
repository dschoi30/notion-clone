package com.example.notionclone.domain.document.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DocumentDto {
    private Long id;
    private String title;
    private String content;
    private Long ownerId;
    private String icon;
} 