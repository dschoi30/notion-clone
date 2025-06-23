package com.example.notionclone.domain.document.entity;

import com.example.notionclone.domain.BaseEntity;
import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.Workspace;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Document extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Builder.Default
    @Column(nullable = false)
    private boolean isTrashed = false;

    @Column(name = "title_column_width", nullable = false)
    private Integer titleColumnWidth = 192;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Document parent;

    @Enumerated(EnumType.STRING)
    @Column(name = "view_type", nullable = false)
    private ViewType viewType;

    @Builder.Default
    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Permission> permissions = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "document", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DocumentProperty> properties = new ArrayList<>();

    public Document(String title, String content) {
        this(title, content, null);
    }

    public Document(String title, String content, Workspace workspace) {
        this.title = title;
        this.content = content;
        this.workspace = workspace;
    }

    public void update(String title, String content, Long parentId) {
        this.title = title;
        this.content = content;
    }

    public void setWorkspace(Workspace workspace) {
        this.workspace = workspace;
    }

    public boolean isTrashed() {
        return isTrashed;
    }

    public void setTrashed(boolean trashed) {
        this.isTrashed = trashed;
    }

    public Document getParent() {
        return parent;
    }

    public void setParent(Document parent) {
        this.parent = parent;
    }

    public ViewType getViewType() {
        return viewType;
    }

    public void setViewType(ViewType viewType) {
        this.viewType = viewType;
    }

    public Integer getTitleColumnWidth() {
        return titleColumnWidth;
    }

    public void setTitleColumnWidth(Integer titleColumnWidth) {
        this.titleColumnWidth = titleColumnWidth;
    }
} 