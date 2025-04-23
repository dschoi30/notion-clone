package com.example.notionclone.domain.workspace.controller;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.domain.workspace.dto.CreateWorkspaceRequest;
import com.example.notionclone.domain.workspace.dto.UpdateWorkspaceRequest;
import com.example.notionclone.domain.workspace.dto.WorkspaceDto;
import com.example.notionclone.domain.workspace.service.WorkspaceService;
import com.example.notionclone.security.CurrentUser;
import com.example.notionclone.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {
    private final WorkspaceService workspaceService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<WorkspaceDto>> getWorkspaces(@CurrentUser UserPrincipal userPrincipal) {
        log.debug("Get workspaces request for user principal: {}", userPrincipal.getId());
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<WorkspaceDto> workspaces = workspaceService.getWorkspaces(user);
        return ResponseEntity.ok(workspaces);
    }

    @GetMapping("/{parentId}/sub-workspaces")
    public ResponseEntity<List<WorkspaceDto>> getSubWorkspaces(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long parentId) {
        log.debug("Get sub-workspaces request for user principal: {} and parent: {}", userPrincipal.getId(), parentId);
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<WorkspaceDto> workspaces = workspaceService.getSubWorkspaces(user, parentId);
        return ResponseEntity.ok(workspaces);
    }

    @PostMapping
    public ResponseEntity<WorkspaceDto> createWorkspace(
            @CurrentUser UserPrincipal userPrincipal,
            @RequestBody CreateWorkspaceRequest request) {
        log.debug("Create workspace request for user principal: {}", userPrincipal.getId());
        log.debug("Request data: {}", request);
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        WorkspaceDto workspace = workspaceService.createWorkspace(user, request.getName(), request.getParentId());
        return ResponseEntity.ok(workspace);
    }

    @PutMapping("/{workspaceId}")
    public ResponseEntity<WorkspaceDto> updateWorkspace(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @RequestBody UpdateWorkspaceRequest request) {
        log.debug("Update workspace request for user principal: {} and workspace: {}", userPrincipal.getId(), workspaceId);
        log.debug("Request data: {}", request);
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        WorkspaceDto workspace = workspaceService.updateWorkspace(user, workspaceId, request.getName(), request.getParentId());
        return ResponseEntity.ok(workspace);
    }

    @DeleteMapping("/{workspaceId}")
    public ResponseEntity<Void> deleteWorkspace(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId) {
        log.debug("Delete workspace request for user principal: {} and workspace: {}", userPrincipal.getId(), workspaceId);
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        workspaceService.deleteWorkspace(user, workspaceId);
        return ResponseEntity.ok().build();
    }
} 