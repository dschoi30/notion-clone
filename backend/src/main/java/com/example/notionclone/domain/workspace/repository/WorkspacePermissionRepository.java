package com.example.notionclone.domain.workspace.repository;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.WorkspacePermission;
import com.example.notionclone.domain.workspace.entity.WorkspaceRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkspacePermissionRepository extends JpaRepository<WorkspacePermission, Long> {
    
    /**
     * 사용자와 워크스페이스 ID로 권한 조회
     */
    @Query("SELECT wp FROM WorkspacePermission wp " +
           "JOIN FETCH wp.workspace w " +
           "WHERE wp.user = :user AND w.id = :workspaceId")
    Optional<WorkspacePermission> findByUserAndWorkspaceId(@Param("user") User user, @Param("workspaceId") Long workspaceId);
    
    /**
     * 사용자 ID와 워크스페이스 ID로 권한 조회 (Spring Data JPA 자동 쿼리 생성)
     */
    Optional<WorkspacePermission> findByUserIdAndWorkspaceId(Long userId, Long workspaceId);
    
    /**
     * 워크스페이스의 모든 활성 권한 조회 (Spring Data JPA 자동 쿼리 생성)
     */
    List<WorkspacePermission> findByWorkspaceIdAndIsActiveTrue(Long workspaceId);
    
    /**
     * 사용자의 모든 워크스페이스 권한 조회
     */
    @Query("SELECT wp FROM WorkspacePermission wp " +
           "JOIN FETCH wp.workspace w " +
           "WHERE wp.user = :user AND wp.isActive = true")
    List<WorkspacePermission> findByUserAndActive(@Param("user") User user);
    
    /**
     * 특정 역할 이상의 권한 조회
     */
    @Query("SELECT wp FROM WorkspacePermission wp " +
           "JOIN FETCH wp.user u " +
           "WHERE wp.workspace.id = :workspaceId " +
           "AND wp.role IN :roles " +
           "AND wp.isActive = true")
    List<WorkspacePermission> findByWorkspaceIdAndRoleInAndActive(
            @Param("workspaceId") Long workspaceId, 
            @Param("roles") List<WorkspaceRole> roles);
    
    /**
     * 워크스페이스 소유자 조회 (Spring Data JPA 자동 쿼리 생성)
     */
    Optional<WorkspacePermission> findByWorkspaceIdAndRoleAndIsActiveTrue(Long workspaceId, WorkspaceRole role);
    
    /**
     * 사용자가 워크스페이스에 속해있는지 확인 (Spring Data JPA 자동 쿼리 생성)
     */
    boolean existsByUserAndWorkspaceIdAndIsActiveTrue(User user, Long workspaceId);
}

