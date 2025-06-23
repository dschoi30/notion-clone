package com.example.notionclone.domain.permission.service;

import com.example.notionclone.domain.permission.entity.*;
import com.example.notionclone.domain.permission.repository.PermissionRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.document.entity.Document;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.Nullable;
import com.example.notionclone.exception.ResourceNotFoundException;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.workspace.repository.WorkspaceRepository;
import com.example.notionclone.domain.user.repository.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {
    private final PermissionRepository permissionRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;

    @Transactional
    public Permission invite(User user, Document document, PermissionType type) {
        Permission permission = Permission.builder()
                .user(user)
                .document(document)
                .permissionType(type)
                .status(PermissionStatus.PENDING)
                .build();
        return permissionRepository.save(permission);
    }

    @Transactional
    public void updateStatus(Permission permission, PermissionStatus status) {
        permission.setStatus(status);
        permissionRepository.save(permission);
    }

    public List<Permission> getAcceptedPermissionsByUser(User user) {
        return permissionRepository.findByUserAndStatus(user, PermissionStatus.ACCEPTED);
    }

    public List<Permission> getAcceptedPermissionsByDocument(Document document) {
        return permissionRepository.findByDocumentAndStatus(document, PermissionStatus.ACCEPTED);
    }

    public Permission getPermission(User user, Document document) {
        return permissionRepository.findByUserAndDocument(user, document)
                .orElse(null);
    }

    public Permission getPermissionByUserIdAndDocumentId(Long userId, Long documentId) {
        return permissionRepository.findByUserIdAndDocumentId(userId, documentId)
                .orElse(null);
    }

    @Transactional
    public Permission updatePermissionType(Long userId, Long documentId, String permissionType) {
        Permission permission = permissionRepository.findByUserIdAndDocumentId(userId, documentId)
            .orElseThrow(() -> new RuntimeException("Permission not found"));
        permission.setPermissionType(PermissionType.valueOf(permissionType));
        return permissionRepository.save(permission);
    }

    @Transactional
    public void removePermission(Long userId, Long documentId) {
        Permission permission = permissionRepository.findByUserIdAndDocumentId(userId, documentId)
            .orElseThrow(() -> new RuntimeException("Permission not found"));
        permissionRepository.delete(permission);
    }

    public boolean hasAcceptedPermission(User user, Document document) {
        Permission permission = getPermission(user, document);
        return permission != null && permission.getStatus() == PermissionStatus.ACCEPTED;
    }

    public boolean hasAcceptedWritePermission(User user, Document document) {
        Permission permission = getPermission(user, document);
        return permission != null
                && permission.getStatus() == PermissionStatus.ACCEPTED
                && permission.getPermissionType() == PermissionType.WRITE;
    }

    public void checkPermission(Long workspaceId, @Nullable Long documentId, Long userId, PermissionType requiredPermission) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace not found with id: " + workspaceId));

        // 워크스페이스 소유자인지 확인 (ID로 비교)
        if (workspace.getUser().getId().equals(userId)) {
            return; // 소유자는 모든 권한을 가짐
        }

        if (documentId == null) {
            // This is for creating root documents. For now, any workspace member can.
            // This might need more specific workspace-level permissions later.
            return; 
        }

        // 문서에 대한 특정 권한 확인
        Permission permission = permissionRepository.findByUserIdAndDocumentId(userId, documentId)
                .orElseThrow(() -> new org.springframework.security.access.AccessDeniedException("문서에 접근할 권한이 없습니다."));

        // PermissionType enum: READ, WRITE, FULL_ACCESS
        if (permission.getPermissionType().ordinal() < requiredPermission.ordinal()) {
            throw new org.springframework.security.access.AccessDeniedException("요청한 작업을 수행할 권한이 없습니다.");
        }
    }
} 