package com.example.notionclone.domain.workspace.controller;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.WorkspacePermission;
import com.example.notionclone.domain.workspace.entity.WorkspaceRole;
import com.example.notionclone.domain.workspace.service.WorkspaceRoleService;
import com.example.notionclone.security.annotation.RequireWorkspaceRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 워크스페이스 역할 관리 컨트롤러
 */
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/members")
@RequiredArgsConstructor
@Slf4j
public class WorkspaceRoleController {

    private final WorkspaceRoleService workspaceRoleService;

    /**
     * 워크스페이스 멤버 목록 조회
     */
    @GetMapping
    @RequireWorkspaceRole(roles = {"OWNER", "ADMIN"})
    public ResponseEntity<List<WorkspacePermission>> getWorkspaceMembers(
            @PathVariable Long workspaceId,
            Authentication authentication) {
        
        List<WorkspacePermission> members = workspaceRoleService.getWorkspaceMembers(workspaceId);
        return ResponseEntity.ok(members);
    }

    /**
     * 사용자 초대
     */
    @PostMapping("/invite")
    @RequireWorkspaceRole(roles = {"OWNER", "ADMIN"})
    public ResponseEntity<WorkspacePermission> inviteUser(
            @PathVariable Long workspaceId,
            @RequestParam Long userId,
            @RequestParam WorkspaceRole role,
            Authentication authentication) {
        
        User currentUser = (User) authentication.getPrincipal();
        // TODO: 워크스페이스 조회 로직 추가 필요
        
        WorkspacePermission permission = workspaceRoleService.inviteUser(
                null, // TODO: 워크스페이스 엔티티 조회
                new User() {{ setId(userId); }}, // TODO: 사용자 조회
                role,
                currentUser
        );
        
        return ResponseEntity.ok(permission);
    }

    /**
     * 사용자 역할 변경
     */
    @PutMapping("/{userId}/role")
    @RequireWorkspaceRole(roles = {"OWNER"})
    public ResponseEntity<WorkspacePermission> changeUserRole(
            @PathVariable Long workspaceId,
            @PathVariable Long userId,
            @RequestParam WorkspaceRole newRole,
            Authentication authentication) {
        
        User currentUser = (User) authentication.getPrincipal();
        
        WorkspacePermission permission = workspaceRoleService.changeUserRole(
                workspaceId, userId, newRole, currentUser);
        
        return ResponseEntity.ok(permission);
    }

    /**
     * 사용자 제거
     */
    @DeleteMapping("/{userId}")
    @RequireWorkspaceRole(roles = {"OWNER"})
    public ResponseEntity<Void> removeUser(
            @PathVariable Long workspaceId,
            @PathVariable Long userId,
            Authentication authentication) {
        
        User currentUser = (User) authentication.getPrincipal();
        
        workspaceRoleService.removeUser(workspaceId, userId, currentUser);
        
        return ResponseEntity.noContent().build();
    }

    /**
     * 사용자의 워크스페이스 목록 조회
     */
    @GetMapping("/my-workspaces")
    public ResponseEntity<List<WorkspacePermission>> getMyWorkspaces(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        
        List<WorkspacePermission> workspaces = workspaceRoleService.getUserWorkspaces(currentUser);
        
        return ResponseEntity.ok(workspaces);
    }
}

