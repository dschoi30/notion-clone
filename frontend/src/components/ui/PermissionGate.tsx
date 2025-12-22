import { ReactNode } from 'react';
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions';

interface PermissionGateProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  workspaceId?: number;
}

/**
 * 권한 기반 접근 제어 컴포넌트
 * 특정 권한이 있는 사용자에게만 자식 컴포넌트를 렌더링
 */
const PermissionGate = ({ 
    children, 
    permission, 
    permissions = [], 
    requireAll = false,
    fallback = null,
    workspaceId 
}: PermissionGateProps) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = useWorkspacePermissions(workspaceId);
    
    let hasRequiredPermission = false;
    
    if (permission) {
        // 단일 권한 확인
        hasRequiredPermission = hasPermission(permission);
    } else if (permissions.length > 0) {
        // 여러 권한 확인
        if (requireAll) {
            hasRequiredPermission = hasAllPermissions(permissions);
        } else {
            hasRequiredPermission = hasAnyPermission(permissions);
        }
    } else {
        // 권한이 지정되지 않은 경우 항상 렌더링
        hasRequiredPermission = true;
    }
    
    if (hasRequiredPermission) {
        return <>{children}</>;
    }
    
    return <>{fallback}</>;
};

export default PermissionGate;

