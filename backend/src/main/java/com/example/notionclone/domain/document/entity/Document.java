package com.example.notionclone.domain.document.entity;

import com.example.notionclone.domain.BaseTimeEntity;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.Workspace;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Document extends BaseTimeEntity {
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

    public Document(String title, String content) {
        this(title, content, null);
    }

    public Document(String title, String content, Workspace workspace) {
        this.title = title;
        this.content = content;
        this.workspace = workspace;
    }

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void setWorkspace(Workspace workspace) {
        this.workspace = workspace;
    }
} 