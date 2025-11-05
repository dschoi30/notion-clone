package com.example.notionclone.domain.document.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.notionclone.domain.document.entity.Document;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    
    List<Document> findByWorkspaceId(Long workspaceId);
    
    List<Document> findByWorkspaceIdAndIsTrashedTrue(Long workspaceId);
    
    List<Document> findByWorkspaceIdAndIsTrashedFalse(Long workspaceId);
    
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

    List<Document> findByWorkspaceIdAndUserId(Long workspaceId, Long userId);

    List<Document> findByWorkspaceIdAndUserIdAndIsTrashedFalse(Long workspaceId, Long userId);

    List<Document> findByParentIdAndIsTrashedFalse(Long parentId);

    List<Document> findByParentIdAndIsTrashedFalseOrderBySortOrderAscIdAsc(Long parentId);

    Page<Document> findByParentIdAndIsTrashedFalseOrderBySortOrderAscIdAsc(Long parentId, Pageable pageable);

    boolean existsByParentIdAndIsTrashedFalse(Long parentId);

    List<Document> findByParentId(Long parentId);

    @Modifying
    @Query("UPDATE Document d SET d.sortOrder = :sortOrder WHERE d.parent.id = :parentId AND d.id = :docId")
    void updateChildSortOrder(@Param("parentId") Long parentId, @Param("docId") Long docId, @Param("sortOrder") int sortOrder);

    /**
     * N+1 문제 해결을 위한 배치 쿼리
     * 여러 문서의 hasChildren 정보를 한 번의 쿼리로 조회합니다.
     * 
     * @param documentIds 문서 ID 목록
     * @return 문서 ID와 hasChildren 여부의 매핑
     */
    @Query("SELECT d.id, COUNT(c.id) > 0 " +
           "FROM Document d " +
           "LEFT JOIN Document c ON d.id = c.parent.id AND c.isTrashed = false " +
           "WHERE d.id IN :documentIds " +
           "GROUP BY d.id")
    List<Object[]> findHasChildrenByDocumentIds(@Param("documentIds") List<Long> documentIds);

    List<Document> findByTitleContainingIgnoreCase(String searchTerm);

    /**
     * 테이블 문서 목록 조회용 경량 쿼리
     * DummyDataTestPanel에서 테이블 문서 선택을 위한 최소 필드만 조회
     * 
     * @param workspaceId 워크스페이스 ID
     * @return [id, title, viewType] 형태의 Object 배열 리스트
     */
    @Query("SELECT d.id, d.title, d.viewType FROM Document d " +
           "WHERE d.workspace.id = :workspaceId " +
           "AND d.viewType = 'TABLE' " +
           "AND d.isTrashed = false " +
           "ORDER BY d.sortOrder ASC, d.id ASC")
    List<Object[]> findTableDocumentsByWorkspaceId(@Param("workspaceId") Long workspaceId);
} 