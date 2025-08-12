package com.example.notionclone.domain.document.entity;

import com.example.notionclone.domain.BaseEntity;
import com.example.notionclone.domain.workspace.entity.Workspace;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "document_versions",
        indexes = {
                @Index(name = "idx_document_versions_workspace_document", columnList = "workspace_id, document_id"),
                @Index(name = "idx_document_versions_hash", columnList = "snapshot_hash")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_document_versions_doc_hash", columnNames = {"document_id", "snapshot_hash"})
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class DocumentVersion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "view_type", nullable = false)
    private ViewType viewType;

    @Column(name = "title_column_width", nullable = false)
    private Integer titleColumnWidth;

    @Column(columnDefinition = "TEXT")
    private String content; // PAGE 전용

    @Column(name = "properties_json", columnDefinition = "TEXT")
    private String propertiesJson; // 컬럼 메타 (id/name/type/sortOrder/width 등)

    @Column(name = "property_values_json", columnDefinition = "TEXT")
    private String propertyValuesJson; // propertyId -> value

    @Column(name = "snapshot_hash", length = 64, nullable = false)
    private String snapshotHash; // 동일 스냅샷 중복 방지
}


