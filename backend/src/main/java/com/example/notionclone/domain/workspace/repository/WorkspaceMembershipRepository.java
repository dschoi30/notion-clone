package com.example.notionclone.domain.workspace.repository;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.WorkspaceMembership;
import com.example.notionclone.domain.workspace.entity.WorkspaceRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspaceMembershipRepository extends JpaRepository<WorkspaceMembership, Long> {
    
    /**
     * 사용자와 워크스페이스 ID로 멤버십 조회
     */
    @Query("SELECT wm FROM WorkspaceMembership wm " +
           "JOIN FETCH wm.workspace w " +
           "WHERE wm.user = :user AND w.id = :workspaceId")
    Optional<WorkspaceMembership> findByUserAndWorkspaceId(@Param("user") User user, @Param("workspaceId") Long workspaceId);
    
    /**
     * 워크스페이스의 모든 활성 멤버십 조회
     */
    @Query("SELECT wm FROM WorkspaceMembership wm " +
           "JOIN FETCH wm.user u " +
           "WHERE wm.workspace.id = :workspaceId AND wm.isActive = true")
    List<WorkspaceMembership> findByWorkspaceIdAndActive(@Param("workspaceId") Long workspaceId);
    
    /**
     * 사용자의 모든 워크스페이스 멤버십 조회
     */
    @Query("SELECT wm FROM WorkspaceMembership wm " +
           "JOIN FETCH wm.workspace w " +
           "WHERE wm.user = :user AND wm.isActive = true")
    List<WorkspaceMembership> findByUserAndActive(@Param("user") User user);
    
    /**
     * 특정 역할 이상의 멤버십 조회
     */
    @Query("SELECT wm FROM WorkspaceMembership wm " +
           "JOIN FETCH wm.user u " +
           "WHERE wm.workspace.id = :workspaceId " +
           "AND wm.role IN :roles " +
           "AND wm.isActive = true")
    List<WorkspaceMembership> findByWorkspaceIdAndRoleInAndActive(
            @Param("workspaceId") Long workspaceId, 
            @Param("roles") List<WorkspaceRole> roles);
    
    /**
     * 워크스페이스 소유자 조회
     */
    @Query("SELECT wm FROM WorkspaceMembership wm " +
           "JOIN FETCH wm.user u " +
           "WHERE wm.workspace.id = :workspaceId " +
           "AND wm.role = 'OWNER' " +
           "AND wm.isActive = true")
    Optional<WorkspaceMembership> findOwnerByWorkspaceId(@Param("workspaceId") Long workspaceId);
    
    /**
     * 사용자가 워크스페이스에 속해있는지 확인
     */
    @Query("SELECT COUNT(wm) > 0 FROM WorkspaceMembership wm " +
           "WHERE wm.user = :user AND wm.workspace.id = :workspaceId AND wm.isActive = true")
    boolean existsByUserAndWorkspaceIdAndActive(@Param("user") User user, @Param("workspaceId") Long workspaceId);
}

