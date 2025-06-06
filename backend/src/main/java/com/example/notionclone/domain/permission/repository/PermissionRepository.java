package com.example.notionclone.domain.permission.repository;

import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    List<Permission> findByUserAndStatus(User user, PermissionStatus status);
    List<Permission> findByDocumentAndStatus(Document document, PermissionStatus status);
    Optional<Permission> findByUserAndDocument(User user, Document document);
    List<Permission> findByDocument(Document document);
} 