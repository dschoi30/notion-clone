import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import api from '../services/api';

/**
 * 워크스페이스 권한 관리 훅
 * 사용자의 워크스페이스 권한을 확인하고 관리
 */
export const useWorkspacePermissions = (workspaceId) => {
    const { user } = useAuth();
    const { currentWorkspace } = useWorkspace();
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 권한 상수 정의 (백엔드 WorkspacePermissionType.java와 일치)
    const WORKSPACE_PERMISSIONS = {
        // 워크스페이스 관리
        DELETE_WORKSPACE: 'DELETE_WORKSPACE',
        MANAGE_WORKSPACE_SETTINGS: 'MANAGE_WORKSPACE_SETTINGS',
        MANAGE_MEMBERS: 'MANAGE_MEMBERS',
        INVITE_MEMBERS: 'INVITE_MEMBERS',
        
        // 문서 관리
        CREATE_DOCUMENT: 'CREATE_DOCUMENT',
        EDIT_DOCUMENT: 'EDIT_DOCUMENT',
        DELETE_DOCUMENT: 'DELETE_DOCUMENT',
        VIEW_DOCUMENT: 'VIEW_DOCUMENT',
        SHARE_DOCUMENT: 'SHARE_DOCUMENT',
        
        // 제한된 접근
        VIEW_SHARED_DOCUMENT: 'VIEW_SHARED_DOCUMENT'
    };

    // 사용자 권한 로드
    const loadPermissions = useCallback(async () => {
        if (!user || !workspaceId) {
            setPermissions([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            console.log('🔍 권한 로드 디버깅:', {
                user: user?.id,
                workspaceId,
                currentWorkspace: currentWorkspace?.id,
                currentWorkspaceOwnerId: currentWorkspace?.ownerId
            });
            
            // 백엔드 API에서 권한 정보 가져오기
            const response = await api.get(`/api/workspaces/${workspaceId}/permissions`);
            const permissionData = response.data;
            
            console.log('📡 백엔드에서 받은 권한 정보:', permissionData);
            
            if (permissionData.hasPermission) {
                setPermissions(permissionData.permissions);
                console.log('✅ 권한 로드 성공:', permissionData.permissions);
            } else {
                setPermissions([]);
                console.log('❌ 권한 없음');
            }
        } catch (err) {
            console.error('권한 로드 실패:', err);
            setError(err.message);
            setPermissions([]);
        } finally {
            setLoading(false);
        }
    }, [user, workspaceId]);

    // 역할별 권한 매핑 (백엔드 WorkspaceRole.java와 동일한 로직)
    const getRolePermissions = (role) => {
        switch (role) {
            case 'OWNER':
                // 소유자는 모든 권한
                return Object.values(WORKSPACE_PERMISSIONS);
            case 'ADMIN':
                // 관리자는 워크스페이스 삭제 권한 제외
                return Object.values(WORKSPACE_PERMISSIONS).filter(p => p !== 'DELETE_WORKSPACE');
            case 'EDITOR':
                // 편집자는 문서 관련 권한
                return [
                    WORKSPACE_PERMISSIONS.CREATE_DOCUMENT,
                    WORKSPACE_PERMISSIONS.EDIT_DOCUMENT,
                    WORKSPACE_PERMISSIONS.DELETE_DOCUMENT,
                    WORKSPACE_PERMISSIONS.VIEW_DOCUMENT,
                    WORKSPACE_PERMISSIONS.SHARE_DOCUMENT
                ];
            case 'VIEWER':
                // 뷰어는 읽기 권한만
                return [WORKSPACE_PERMISSIONS.VIEW_DOCUMENT];
            case 'GUEST':
                // 게스트는 공유된 문서만 보기
                return [WORKSPACE_PERMISSIONS.VIEW_SHARED_DOCUMENT];
            default:
                return [];
        }
    };

    // 특정 권한 확인
    const hasPermission = useCallback((permission) => {
        return permissions.includes(permission);
    }, [permissions]);

    // 여러 권한 중 하나라도 있는지 확인
    const hasAnyPermission = useCallback((permissionList) => {
        return permissionList.some(permission => hasPermission(permission));
    }, [hasPermission]);

    // 모든 권한을 가지고 있는지 확인
    const hasAllPermissions = useCallback((permissionList) => {
        return permissionList.every(permission => hasPermission(permission));
    }, [hasPermission]);

    // 편의 메서드들
    const canCreateDocument = useCallback(() => {
        return hasPermission(WORKSPACE_PERMISSIONS.CREATE_DOCUMENT);
    }, [hasPermission]);

    const canEditDocument = useCallback(() => {
        return hasPermission(WORKSPACE_PERMISSIONS.EDIT_DOCUMENT);
    }, [hasPermission]);

    const canDeleteDocument = useCallback(() => {
        return hasPermission(WORKSPACE_PERMISSIONS.DELETE_DOCUMENT);
    }, [hasPermission]);

    const canShareDocument = useCallback(() => {
        return hasPermission(WORKSPACE_PERMISSIONS.SHARE_DOCUMENT);
    }, [hasPermission]);

    const canManageMembers = useCallback(() => {
        return hasPermission(WORKSPACE_PERMISSIONS.MANAGE_MEMBERS);
    }, [hasPermission]);

    const canInviteMembers = useCallback(() => {
        return hasPermission(WORKSPACE_PERMISSIONS.INVITE_MEMBERS);
    }, [hasPermission]);

    const isWorkspaceOwner = useCallback(() => {
        return hasPermission(WORKSPACE_PERMISSIONS.DELETE_WORKSPACE);
    }, [hasPermission]);

    const isWorkspaceAdmin = useCallback(() => {
        return hasAnyPermission([
            WORKSPACE_PERMISSIONS.DELETE_WORKSPACE,
            WORKSPACE_PERMISSIONS.MANAGE_WORKSPACE_SETTINGS,
            WORKSPACE_PERMISSIONS.MANAGE_MEMBERS
        ]);
    }, [hasAnyPermission]);

    // 권한 로드
    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);

    return {
        permissions,
        loading,
        error,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        canCreateDocument,
        canEditDocument,
        canDeleteDocument,
        canShareDocument,
        canManageMembers,
        canInviteMembers,
        isWorkspaceOwner,
        isWorkspaceAdmin,
        WORKSPACE_PERMISSIONS,
        reloadPermissions: loadPermissions
    };
};
