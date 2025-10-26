import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import WorkspaceGeneralForm from './WorkspaceGeneralForm';
import AccountBasicForm from './AccountBasicForm';
import PermissionExample from '../examples/PermissionExample';
import { Z_INDEX } from '@/constants/zIndex';

// 단순 레이아웃 셸: VersionHistoryPanel과 동일한 패널/오버레이 구조
// 좌측 네비 + 우측 컨텐츠 영역만 제공. 세부 폼은 후속 태스크에서 구현.

const NAV_ITEMS = [
  { id: 'account', label: '계정', isSection: true },
  { id: 'account-basic', label: '기본 설정' },
  { id: 'workspace', label: '워크스페이스', isSection: true },
  { id: 'workspace-general', label: '일반' },
  { id: 'permissions', label: '권한 시스템', isSection: true },
  { id: 'permission-example', label: '권한 예시' },
];

export default function SettingsPanel({ onClose }) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const firstSelectableId = useMemo(() => (NAV_ITEMS.find(i => !i.isSection)?.id || 'account-basic'), []);
  const [selected, setSelected] = useState(firstSelectableId);

  const title = useMemo(() => {
    switch (selected) {
      case 'workspace-general':
        return '워크스페이스 설정';
      case 'account-basic':
        return '기본 설정';
      case 'permission-example':
        return '권한 시스템 예시';
      default:
        return '설정';
    }
  }, [selected, currentWorkspace]);

  return (
    <div 
      className="fixed inset-0 flex justify-center items-center bg-black/30" 
      style={{ zIndex: Z_INDEX.SETTINGS_PANEL }}
      onClick={onClose}
    >
      <div className="relative bg-white w-[1040px] h-[85vh] rounded-lg shadow-2xl flex" onClick={(e) => e.stopPropagation()}>
        {/* 좌측 네비 (좌측 배치 + 구분선) */}
        <div className="flex relative flex-col p-4 w-80 h-full bg-white rounded-l-lg border-r">
          <div className="overflow-auto flex-1">
            <ul className="space-y-1">
              {NAV_ITEMS.map(item => {
                if (item.isSection) {
                  return (
                    <li key={item.id} className="mt-3 mb-1 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      {item.label}
                    </li>
                  );
                }
                const isActive = selected === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-2 py-1 rounded ${isActive ? 'text-gray-900 bg-gray-100' : 'text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => setSelected(item.id)}
                    >
                      <span className="text-sm truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 메인 영역 (우측) */}
        <div className="overflow-auto flex-1 p-8 rounded-r-lg">
          <div className="flex items-center mb-4">
            <h3 className="text-xl font-bold truncate">{title}</h3>
          </div>

          {/* 컨텐츠 플레이스홀더: 후속 태스크에서 각 폼 구현 */}
          {selected === 'workspace-general' && (
            <WorkspaceGeneralForm />
          )}

          {selected === 'account-basic' && (
            <AccountBasicForm />
          )}

          {selected === 'permission-example' && (
            <PermissionExample workspaceId={currentWorkspace?.id} />
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="absolute top-4 right-4">
          <Button variant="ghost" size="icon" aria-label="close" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}