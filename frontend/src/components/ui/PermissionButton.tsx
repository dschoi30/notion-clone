import { ButtonHTMLAttributes, ReactNode, MouseEvent } from 'react';
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions';

interface PermissionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  workspaceId?: number;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

/**
 * 권한 기반 버튼 컴포넌트
 * 특정 권한이 있는 사용자에게만 버튼을 활성화
 */
const PermissionButton = ({ 
    children,
    permission,
    permissions = [],
    requireAll = false,
    workspaceId,
    disabled = false,
    onClick,
    className = '',
    ...props 
}: PermissionButtonProps) => {
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
        // 권한이 지정되지 않은 경우 항상 활성화
        hasRequiredPermission = true;
    }
    
    const isDisabled = disabled || !hasRequiredPermission;
    
    return (
        <button
            {...props}
            className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isDisabled}
            onClick={hasRequiredPermission ? onClick : undefined}
        >
            {children}
        </button>
    );
};

export default PermissionButton;

