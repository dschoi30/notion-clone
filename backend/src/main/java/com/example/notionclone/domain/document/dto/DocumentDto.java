package com.example.notionclone.domain.document.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DocumentDto {
    private Long id;
    private String title;
    private String content;
    private Long parentId;
    private Long ownerId;
    private boolean isFolder;
    private String icon;
    private Integer position;
} 