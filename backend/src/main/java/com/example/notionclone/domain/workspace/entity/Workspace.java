package com.example.notionclone.domain.workspace.entity;

import com.example.notionclone.domain.BaseEntity;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workspaces")
@Getter
@ToString(exclude = {"user", "parent", "subWorkspaces", "documents"})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Workspace extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Workspace parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Workspace> subWorkspaces = new ArrayList<>();

    @OneToMany(mappedBy = "workspace", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Document> documents = new ArrayList<>();

    @Builder
    public Workspace(String name, User user, Workspace parent) {
        this.name = name;
        this.user = user;
        this.parent = parent;
    }

    public void update(String name) {
        this.name = name;
    }

    public void addSubWorkspace(Workspace workspace) {
        this.subWorkspaces.add(workspace);
        workspace.setParent(this);
    }

    public void removeSubWorkspace(Workspace workspace) {
        this.subWorkspaces.remove(workspace);
        workspace.setParent(null);
    }

    public void setParent(Workspace parent) {
        this.parent = parent;
    }

    public void addDocument(Document document) {
        this.documents.add(document);
        document.setWorkspace(this);
    }

    public void removeDocument(Document document) {
        this.documents.remove(document);
        document.setWorkspace(null);
    }
} 