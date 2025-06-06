package com.example.notionclone.domain.permission.service;

import com.example.notionclone.domain.permission.entity.*;
import com.example.notionclone.domain.permission.repository.PermissionRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.document.entity.Document;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionService {
    private final PermissionRepository permissionRepository;

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
} 