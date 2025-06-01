package com.example.notionclone.domain.document.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.notionclone.domain.document.entity.Document;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    List<Document> findByWorkspaceId(Long workspaceId);
    
    List<Document> findByWorkspaceIdAndIsTrashedTrue(Long workspaceId);
    
    @Query("SELECT d FROM Document d WHERE d.workspace IS NULL")
    List<Document> findDocumentsWithNoWorkspace();
    
    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.workspace WHERE d.id = :id")
    Document findByIdWithWorkspace(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Document d SET d.sortOrder = :sortOrder WHERE d.workspace.id = :workspaceId AND d.id = :docId")
    void updateSortOrder(@Param("workspaceId") Long workspaceId, @Param("docId") Long docId, @Param("sortOrder") int sortOrder);

    @Modifying
    @Query("DELETE FROM Document d WHERE d.workspace.id = :workspaceId AND d.isTrashed = true")
    void deleteAllTrashedByWorkspaceId(@Param("workspaceId") Long workspaceId);
} 