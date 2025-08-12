import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getDocumentVersions, getDocumentVersion } from '@/services/documentApi';

export default function VersionHistoryPanel({ workspaceId, documentId, onClose }) {
  const [versions, setVersions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const page = await getDocumentVersions(workspaceId, documentId, { page: 0, size: 50 });
        if (!mounted) return;
        setVersions(page.content || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [workspaceId, documentId]);

  const handleSelect = async (versionId) => {
    const detail = await getDocumentVersion(workspaceId, documentId, versionId);
    setSelected(detail);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[720px] bg-white shadow-2xl border-l flex">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">버전 미리보기</h3>
          <Button variant="ghost" onClick={onClose}>닫기</Button>
        </div>
        {!selected && <div className="text-sm text-gray-500">우측 목록에서 버전을 선택하세요.</div>}
        {selected && (
          <div>
            <h4 className="text-2xl font-bold mb-2">{selected.title}</h4>
            <div className="text-xs text-gray-500 mb-4">{selected.createdBy} · {new Date(selected.createdAt).toLocaleString()}</div>
            {/* PAGE 전용 간단 렌더 */}
            {selected.content && (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selected.content }} />
            )}
          </div>
        )}
      </div>
      <div className="w-80 border-l p-4 overflow-auto">
        <div className="font-semibold mb-3">버전 기록</div>
        {loading && <div className="text-sm">불러오는 중...</div>}
        {!loading && versions.length === 0 && <div className="text-sm text-gray-500">기록 없음</div>}
        <ul className="space-y-2">
          {versions.map(v => (
            <li key={v.id} className="cursor-pointer" onClick={() => handleSelect(v.id)}>
              <div className="text-sm font-medium truncate">{v.title}</div>
              <div className="text-xs text-gray-500">{v.createdBy} · {new Date(v.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


