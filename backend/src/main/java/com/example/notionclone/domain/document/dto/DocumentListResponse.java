package com.example.notionclone.domain.document.dto;

import com.example.notionclone.domain.document.entity.Document;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * DocumentList 조회용 경량 DTO
 * 목록 조회 시 불필요한 대용량 데이터(content, properties, permissions)를 제거하여
 * 네트워크 트래픽과 메모리 사용량을 최적화합니다.
 */
@Getter
@Builder
public class DocumentListResponse {
    private Long id;
    private String title;
    private Long parentId;
    private String viewType;
    private Long userId;
    private Long workspaceId;
    private boolean hasChildren;
    private Integer sortOrder;
    private LocalDateTime updatedAt;
    private String updatedBy;
    private LocalDateTime createdAt;
    private String createdBy;
    private boolean isShared; // 공유 문서 여부 (프론트엔드 분류를 위해 필요)
    
    // content, properties, permissions 제외 - 목록 조회 시 불필요한 데이터

    /**
     * Document 엔티티에서 DocumentListResponse로 변환
     * @param document Document 엔티티
     * @param hasChildren 자식 문서 존재 여부
     * @param isShared 공유 문서 여부
     * @return DocumentListResponse
     */
    public static DocumentListResponse fromDocument(Document document, boolean hasChildren, boolean isShared) {
        return DocumentListResponse.builder()
                .id(document.getId())
                .title(document.getTitle())
                .parentId(document.getParent() != null ? document.getParent().getId() : null)
                .viewType(document.getViewType().name())
                .userId(document.getUser().getId())
                .workspaceId(document.getWorkspace() != null ? document.getWorkspace().getId() : null)
                .hasChildren(hasChildren)
                .sortOrder(document.getSortOrder())
                .updatedAt(document.getUpdatedAt())
                .updatedBy(document.getUpdatedBy())
                .createdAt(document.getCreatedAt())
                .createdBy(document.getCreatedBy())
                .isShared(isShared)
                .build();
    }

    /**
     * Document 엔티티에서 DocumentListResponse로 변환 (hasChildren 기본값 false, isShared 기본값 false)
     * @param document Document 엔티티
     * @return DocumentListResponse
     */
    public static DocumentListResponse fromDocument(Document document) {
        return fromDocument(document, false, false);
    }
}
