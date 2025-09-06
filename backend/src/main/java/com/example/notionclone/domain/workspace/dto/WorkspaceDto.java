package com.example.notionclone.domain.workspace.dto;

import com.example.notionclone.domain.workspace.entity.Workspace;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceDto {
    private Long id;
    private String name;
    private String iconUrl;
    private Long ownerId;

    public static WorkspaceDto from(Workspace workspace) {
        return new WorkspaceDto(
            workspace.getId(),
            workspace.getName(),
            workspace.getIconUrl(),
            workspace.getUser() != null ? workspace.getUser().getId() : null
        );
    }
} 