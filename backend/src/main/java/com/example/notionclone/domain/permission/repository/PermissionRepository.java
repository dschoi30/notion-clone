package com.example.notionclone.domain.permission.repository;

import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Long> {
    List<Permission> findByUserAndStatus(User user, PermissionStatus status);
    List<Permission> findByDocumentAndStatus(Document document, PermissionStatus status);
    Optional<Permission> findByUserAndDocument(User user, Document document);
    boolean existsByUserAndDocumentAndStatus(User user, Document document, PermissionStatus status);
    List<Permission> findByDocument(Document document);
    Optional<Permission> findByUserIdAndDocumentId(Long userId, Long documentId);

    @Query("""
        select p.document.id from Permission p
        where p.user.id = :userId
        and p.status = :status
        and p.document.workspace.id = :workspaceId
    """)
    List<Long> findAcceptedDocumentIdsByUserAndWorkspace(@Param("userId") Long userId, @Param("status") PermissionStatus status, @Param("workspaceId") Long workspaceId);

    /**
     * 특정 문서들 중에서 소유자를 제외한 다른 사용자 권한이 있는 문서 ID 목록을 조회합니다.
     * 
     * @param documentIds 문서 ID 목록
     * @param ownerId 소유자 ID
     * @return 공유된 문서 ID 목록
     */
    @Query("""
        select distinct p.document.id from Permission p
        where p.document.id in :documentIds
        and p.user.id != :ownerId
    """)
    List<Long> findDocumentIdsWithOtherUserPermissions(@Param("documentIds") List<Long> documentIds, @Param("ownerId") Long ownerId);
} 