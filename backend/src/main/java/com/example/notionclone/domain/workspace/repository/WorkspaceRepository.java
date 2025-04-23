package com.example.notionclone.domain.workspace.repository;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.Workspace;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkspaceRepository extends JpaRepository<Workspace, Long> {
    List<Workspace> findByUserAndParentIsNull(User user);
    List<Workspace> findByUserAndParent(User user, Workspace parent);
    boolean existsByNameAndUserAndParent(String name, User user, Workspace parent);
} 