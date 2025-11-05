import React from 'react';
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions';
import PermissionGate from '../ui/PermissionGate';
import PermissionButton from '../ui/PermissionButton';

/**
 * 권한 시스템 사용 예시 컴포넌트
 */
const PermissionExample = ({ workspaceId }) => {
    const { 
        canCreateDocument, 
        canEditDocument, 
        canDeleteDocument,
        canManageMembers,
        isWorkspaceOwner,
        isWorkspaceAdmin,
        permissions,
        loading,
        error,
        WORKSPACE_PERMISSIONS 
    } = useWorkspacePermissions(workspaceId);

    // 디버깅 정보 출력
    console.log('🔍 PermissionExample 디버깅:', {
        workspaceId,
        permissions,
        loading,
        error,
        canCreateDocument: canCreateDocument(),
        canEditDocument: canEditDocument(),
        canDeleteDocument: canDeleteDocument(),
        canManageMembers: canManageMembers(),
        isWorkspaceOwner: isWorkspaceOwner(),
        isWorkspaceAdmin: isWorkspaceAdmin()
    });

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">권한 시스템 예시</h1>
                <div className="text-center py-8">
                    <div className="text-lg">권한 정보를 로드하는 중...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">권한 시스템 예시</h1>
                <div className="text-center py-8">
                    <div className="text-lg text-red-600">권한 로드 중 오류가 발생했습니다: {error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">권한 시스템 예시</h1>
            
            {/* 디버깅 정보 표시 */}
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800">디버깅 정보</h3>
                <div className="text-sm text-yellow-700">
                    <div>워크스페이스 ID: {workspaceId}</div>
                    <div>권한 개수: {permissions.length}</div>
                    <div>권한 목록: {permissions.join(', ')}</div>
                    <div>로딩 상태: {loading ? '로딩 중' : '완료'}</div>
                    <div>에러: {error || '없음'}</div>
                </div>
            </div>
            
            {/* 권한 상태 표시 */}
            <div className="mb-8 p-4 bg-gray-100 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">현재 권한 상태</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                        <span className="font-medium">문서 생성:</span>
                        <span className={`ml-2 px-2 py-1 rounded ${canCreateDocument() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {canCreateDocument() ? '가능' : '불가능'}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-medium">문서 편집:</span>
                        <span className={`ml-2 px-2 py-1 rounded ${canEditDocument() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {canEditDocument() ? '가능' : '불가능'}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-medium">문서 삭제:</span>
                        <span className={`ml-2 px-2 py-1 rounded ${canDeleteDocument() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {canDeleteDocument() ? '가능' : '불가능'}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-medium">멤버 관리:</span>
                        <span className={`ml-2 px-2 py-1 rounded ${canManageMembers() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {canManageMembers() ? '가능' : '불가능'}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-medium">워크스페이스 소유자:</span>
                        <span className={`ml-2 px-2 py-1 rounded ${isWorkspaceOwner() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isWorkspaceOwner() ? '예' : '아니오'}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="font-medium">워크스페이스 관리자:</span>
                        <span className={`ml-2 px-2 py-1 rounded ${isWorkspaceAdmin() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {isWorkspaceAdmin() ? '예' : '아니오'}
                        </span>
                    </div>
                </div>
            </div>

            {/* PermissionGate 사용 예시 */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">PermissionGate 사용 예시</h2>
                <div className="space-y-4">
                    {/* 문서 생성 권한이 있는 경우에만 표시 */}
                    <PermissionGate 
                        permission={WORKSPACE_PERMISSIONS.CREATE_DOCUMENT}
                        workspaceId={workspaceId}
                        fallback={<div className="text-gray-500">문서 생성 권한이 없습니다.</div>}
                    >
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-800">문서 생성 패널</h3>
                            <p className="text-blue-600">이 패널은 문서 생성 권한이 있는 사용자에게만 표시됩니다.</p>
                        </div>
                    </PermissionGate>

                    {/* 멤버 관리 권한이 있는 경우에만 표시 */}
                    <PermissionGate 
                        permission={WORKSPACE_PERMISSIONS.MANAGE_MEMBERS}
                        workspaceId={workspaceId}
                        fallback={<div className="text-gray-500">멤버 관리 권한이 없습니다.</div>}
                    >
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h3 className="font-semibold text-green-800">멤버 관리 패널</h3>
                            <p className="text-green-600">이 패널은 멤버 관리 권한이 있는 사용자에게만 표시됩니다.</p>
                        </div>
                    </PermissionGate>
                </div>
            </div>

            {/* PermissionButton 사용 예시 */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">PermissionButton 사용 예시</h2>
                <div className="space-x-4">
                    <PermissionButton
                        permission={WORKSPACE_PERMISSIONS.CREATE_DOCUMENT}
                        workspaceId={workspaceId}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={() => alert('문서 생성 버튼 클릭!')}
                    >
                        문서 생성
                    </PermissionButton>

                    <PermissionButton
                        permission={WORKSPACE_PERMISSIONS.EDIT_DOCUMENT}
                        workspaceId={workspaceId}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        onClick={() => alert('문서 편집 버튼 클릭!')}
                    >
                        문서 편집
                    </PermissionButton>

                    <PermissionButton
                        permission={WORKSPACE_PERMISSIONS.DELETE_DOCUMENT}
                        workspaceId={workspaceId}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => alert('문서 삭제 버튼 클릭!')}
                    >
                        문서 삭제
                    </PermissionButton>

                    <PermissionButton
                        permission={WORKSPACE_PERMISSIONS.MANAGE_MEMBERS}
                        workspaceId={workspaceId}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                        onClick={() => alert('멤버 관리 버튼 클릭!')}
                    >
                        멤버 관리
                    </PermissionButton>
                </div>
            </div>

            {/* 복합 권한 예시 */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">복합 권한 예시</h2>
                <div className="space-y-4">
                    {/* 문서 생성 또는 편집 권한 중 하나라도 있으면 표시 */}
                    <PermissionGate 
                        permissions={[
                            WORKSPACE_PERMISSIONS.CREATE_DOCUMENT,
                            WORKSPACE_PERMISSIONS.EDIT_DOCUMENT
                        ]}
                        requireAll={false}
                        workspaceId={workspaceId}
                        fallback={<div className="text-gray-500">문서 생성 또는 편집 권한이 없습니다.</div>}
                    >
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h3 className="font-semibold text-yellow-800">문서 작업 패널</h3>
                            <p className="text-yellow-600">이 패널은 문서 생성 또는 편집 권한이 있는 사용자에게 표시됩니다.</p>
                        </div>
                    </PermissionGate>

                    {/* 문서 생성과 편집 권한을 모두 가지고 있어야 표시 */}
                    <PermissionGate 
                        permissions={[
                            WORKSPACE_PERMISSIONS.CREATE_DOCUMENT,
                            WORKSPACE_PERMISSIONS.EDIT_DOCUMENT
                        ]}
                        requireAll={true}
                        workspaceId={workspaceId}
                        fallback={<div className="text-gray-500">문서 생성과 편집 권한이 모두 필요합니다.</div>}
                    >
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <h3 className="font-semibold text-indigo-800">고급 문서 작업 패널</h3>
                            <p className="text-indigo-600">이 패널은 문서 생성과 편집 권한을 모두 가진 사용자에게만 표시됩니다.</p>
                        </div>
                    </PermissionGate>
                </div>
            </div>
        </div>
    );
};

export default PermissionExample;
