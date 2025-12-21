import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  workspaceId?: number;
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * 권한 기반 보호된 라우트 컴포넌트
 * 특정 권한이 있는 사용자만 접근 가능
 */
const ProtectedRoute = ({ 
    children, 
    permission, 
    permissions = [], 
    requireAll = false,
    workspaceId,
    redirectTo = '/unauthorized',
    fallback = null 
}: ProtectedRouteProps) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = useWorkspacePermissions(workspaceId);
    
    // 로딩 중일 때는 로딩 표시
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }
    
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
        // 권한이 지정되지 않은 경우 항상 접근 허용
        hasRequiredPermission = true;
    }
    
    if (hasRequiredPermission) {
        return <>{children}</>;
    }
    
    // 권한이 없는 경우 리다이렉트 또는 폴백 렌더링
    if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
    }
    
    return <>{fallback || (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">접근 권한이 없습니다</h1>
                <p className="text-gray-600 mb-8">이 페이지에 접근할 권한이 없습니다.</p>
                <button 
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    이전 페이지로 돌아가기
                </button>
            </div>
        </div>
    )}</>;
};

export default ProtectedRoute;

