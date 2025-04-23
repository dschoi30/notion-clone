package com.example.notionclone.domain.workspace.service;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.dto.WorkspaceDto;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.workspace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceService {
    private final WorkspaceRepository workspaceRepository;

    public List<WorkspaceDto> getWorkspaces(User user) {
        log.debug("Fetching workspaces for user: {}", user.getId());
        List<Workspace> workspaces = workspaceRepository.findByUserAndParentIsNull(user);
        return workspaces.stream()
                .map(WorkspaceDto::from)
                .collect(Collectors.toList());
    }

    public List<WorkspaceDto> getSubWorkspaces(User user, Long parentId) {
        log.debug("Fetching sub-workspaces for user: {} and parent: {}", user.getId(), parentId);
        Workspace parent = workspaceRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));
        List<Workspace> workspaces = workspaceRepository.findByUserAndParent(user, parent);
        return workspaces.stream()
                .map(WorkspaceDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public WorkspaceDto createWorkspace(User user, String name, Long parentId) {
        log.debug("Creating workspace. User: {}, Name: {}, ParentId: {}", user.getId(), name, parentId);
        
        Workspace workspace = Workspace.builder()
                .name(name)
                .user(user)
                .build();

        log.debug("Built workspace: {}", workspace);
        log.debug("Workspace user: {}", workspace.getUser());

        if (parentId != null) {
            Workspace parent = workspaceRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("Parent workspace not found"));
            parent.addSubWorkspace(workspace);
            log.debug("Added to parent workspace: {}", parent.getId());
        }

        workspace = workspaceRepository.save(workspace);
        log.debug("Saved workspace with ID: {}", workspace.getId());
        
        return WorkspaceDto.from(workspace);
    }

    @Transactional
    public WorkspaceDto updateWorkspace(User user, Long workspaceId, String name, Long parentId) {
        log.debug("Updating workspace. User: {}, WorkspaceId: {}, Name: {}, ParentId: {}", 
                user.getId(), workspaceId, name, parentId);
        
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        if (!workspace.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to update this workspace");
        }

        workspace.update(name);

        if (parentId != null) {
            Workspace parent = workspaceRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("Parent workspace not found"));
            if (workspace.getParent() != null) {
                workspace.getParent().removeSubWorkspace(workspace);
            }
            parent.addSubWorkspace(workspace);
            log.debug("Updated parent workspace to: {}", parent.getId());
        } else if (workspace.getParent() != null) {
            workspace.getParent().removeSubWorkspace(workspace);
            log.debug("Removed from parent workspace");
        }

        return WorkspaceDto.from(workspace);
    }

    @Transactional
    public void deleteWorkspace(User user, Long workspaceId) {
        log.debug("Deleting workspace. User: {}, WorkspaceId: {}", user.getId(), workspaceId);
        
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new RuntimeException("Workspace not found"));

        if (!workspace.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Not authorized to delete this workspace");
        }

        if (workspace.getParent() != null) {
            workspace.getParent().removeSubWorkspace(workspace);
            log.debug("Removed from parent workspace");
        }

        workspaceRepository.delete(workspace);
        log.debug("Workspace deleted");
    }
} 