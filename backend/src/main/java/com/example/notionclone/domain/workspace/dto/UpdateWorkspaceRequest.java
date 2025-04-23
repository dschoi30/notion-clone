package com.example.notionclone.domain.workspace.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateWorkspaceRequest {
    private String name;
    private Long parentId;
} 