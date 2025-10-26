package com.example.notionclone.domain.workspace.controller;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.domain.workspace.dto.CreateWorkspaceRequest;
import com.example.notionclone.domain.workspace.dto.UpdateWorkspaceRequest;
import com.example.notionclone.domain.workspace.dto.WorkspaceDto;
import com.example.notionclone.domain.workspace.entity.WorkspacePermission;
import com.example.notionclone.domain.workspace.entity.WorkspaceRole;
import com.example.notionclone.domain.workspace.repository.WorkspacePermissionRepository;
import com.example.notionclone.domain.workspace.service.WorkspaceService;
import com.example.notionclone.security.CurrentUser;
import com.example.notionclone.security.UserPrincipal;
import com.example.notionclone.security.annotation.RequireRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {
    private final WorkspaceService workspaceService;
    private final UserRepository userRepository;
    private final WorkspacePermissionRepository workspacePermissionRepository;

    @GetMapping
    public ResponseEntity<List<WorkspaceDto>> getWorkspaces(@CurrentUser UserPrincipal userPrincipal) {
        log.debug("Get workspaces request for user principal: {}", userPrincipal.getId());
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<WorkspaceDto> workspaces = workspaceService.getWorkspaces(user);
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
        WorkspaceDto workspace = workspaceService.createWorkspace(user, request.getName());
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
        WorkspaceDto workspace = workspaceService.updateWorkspace(user, workspaceId, request.getName(), request.getIconUrl());
        return ResponseEntity.ok(workspace);
    }

    @DeleteMapping("/{workspaceId}")
    public ResponseEntity<Void> deleteWorkspace(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId) {
        log.debug("Delete workspace request for user principal: {} and workspace: {}", userPrincipal.getId(), workspaceId);
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        workspaceService.softDeleteWorkspace(user, workspaceId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/accessible")
    public ResponseEntity<List<WorkspaceDto>> getAccessibleWorkspaces(@CurrentUser UserPrincipal userPrincipal) {
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<WorkspaceDto> workspaces = workspaceService.getAccessibleWorkspaces(user);
        return ResponseEntity.ok(workspaces);
    }

    /**
     * 사용자의 워크스페이스 권한 조회
     */
    @GetMapping("/{workspaceId}/permissions")
    @RequireRole(roles = {"SUPER_ADMIN", "ADMIN", "USER"})
    public ResponseEntity<WorkspacePermissionResponse> getUserPermissions(
            @PathVariable Long workspaceId,
            @CurrentUser UserPrincipal userPrincipal) {
        
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Optional<WorkspacePermission> permissionOpt = workspacePermissionRepository
                .findByUserAndWorkspaceId(user, workspaceId);
        
        if (permissionOpt.isEmpty()) {
            return ResponseEntity.ok(WorkspacePermissionResponse.noPermission());
        }
        
        WorkspacePermission permission = permissionOpt.get();
        if (!permission.isActive()) {
            return ResponseEntity.ok(WorkspacePermissionResponse.noPermission());
        }
        
        List<String> permissions = getRolePermissions(permission.getRole());
        
        return ResponseEntity.ok(WorkspacePermissionResponse.builder()
                .hasPermission(true)
                .role(permission.getRole().name())
                .permissions(permissions)
                .build());
    }

    /**
     * 역할별 권한 매핑
     */
    private List<String> getRolePermissions(WorkspaceRole role) {
        return switch (role) {
            case OWNER -> List.of(
                "DELETE_WORKSPACE", "MANAGE_WORKSPACE_SETTINGS", "MANAGE_MEMBERS", "INVITE_MEMBERS",
                "CREATE_DOCUMENT", "EDIT_DOCUMENT", "DELETE_DOCUMENT", "VIEW_DOCUMENT", "SHARE_DOCUMENT"
            );
            case ADMIN -> List.of(
                "MANAGE_WORKSPACE_SETTINGS", "MANAGE_MEMBERS", "INVITE_MEMBERS",
                "CREATE_DOCUMENT", "EDIT_DOCUMENT", "DELETE_DOCUMENT", "VIEW_DOCUMENT", "SHARE_DOCUMENT"
            );
            case EDITOR -> List.of(
                "CREATE_DOCUMENT", "EDIT_DOCUMENT", "DELETE_DOCUMENT", "VIEW_DOCUMENT", "SHARE_DOCUMENT"
            );
            case VIEWER -> List.of("VIEW_DOCUMENT");
            case GUEST -> List.of("VIEW_SHARED_DOCUMENT");
        };
    }

    /**
     * 워크스페이스 권한 응답 DTO
     */
    @lombok.Builder
    @lombok.Getter
    public static class WorkspacePermissionResponse {
        private boolean hasPermission;
        private String role;
        private List<String> permissions;

        public static WorkspacePermissionResponse noPermission() {
            return WorkspacePermissionResponse.builder()
                    .hasPermission(false)
                    .role("NONE")
                    .permissions(List.of())
                    .build();
        }
    }
} 