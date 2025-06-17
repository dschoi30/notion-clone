import React, { useState } from 'react';
import { Button } from '../ui/button';

export default function DocumentTableView({ properties, setProperties, rows, setRows }) {
  // 속성 추가 모달 상태
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState('text');

  // '+ 속성 추가' 클릭 시
  const handleAddProperty = () => {
    setShowPropertyModal(true);
    setNewPropertyName('');
    setNewPropertyType('text');
  };

  // 모달에서 속성 추가 확인
  const handleConfirmAddProperty = () => {
    if (!newPropertyName) return;
    const newProperty = { id: Date.now().toString(), name: newPropertyName, type: newPropertyType };
    setProperties(prev => [...prev, newProperty]);
    setRows(prev => prev.map(row => ({ ...row, values: { ...row.values, [newProperty.id]: '' } })));
    setShowPropertyModal(false);
  };

  // '새 페이지' 클릭 시
  const handleAddRow = () => {
    const newRow = { id: Date.now().toString(), title: '', values: {} };
    properties.forEach(p => { newRow.values[p.id] = ''; });
    setRows(prev => [...prev, newRow]);
  };

  // 셀 값 변경
  const handleCellChange = (rowId, propertyId, value) => {
    setRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, values: { ...row.values, [propertyId]: value } } : row
    ));
  };

  // 이름(title) 변경
  const handleTitleCellChange = (rowId, value) => {
    setRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, title: value } : row
    ));
  };

  return (
    <div className="border rounded bg-white">
      <div className="flex items-center border-b px-4 py-2">
        {/* 이름 컬럼 */}
        <div className="font-semibold" style={{ minWidth: '12rem', width: '12rem' }}>이름</div>
        {/* property 컬럼 */}
        {properties.map(p => (
          <div key={p.id} className="font-semibold" style={{ minWidth: '12rem', width: '12rem' }}>{p.name}</div>
        ))}
        <Button size="sm" variant="ghost" className="ml-2" onClick={handleAddProperty}>+ 속성 추가</Button>
      </div>
      <div className="px-4 py-2">
        {rows.length === 0 ? (
          <div className="flex items-center h-10 text-gray-400">빈 행</div>
        ) : (
          rows.map(row => (
            <div key={row.id} className="flex items-center h-10 border-b last:border-b-0">
              {/* 이름 셀 */}
              <input
                className="border rounded px-2 py-1 mx-1"
                style={{ minWidth: '12rem', width: '12rem' }}
                value={row.title || ''}
                onChange={e => handleTitleCellChange(row.id, e.target.value)}
                placeholder="제목 없음"
              />
              {/* property 셀 */}
              {properties.map(p => (
                <input
                  key={p.id}
                  className="border rounded px-2 py-1 mx-1"
                  style={{ minWidth: '12rem', width: '12rem' }}
                  value={row.values[p.id] || ''}
                  onChange={e => handleCellChange(row.id, p.id, e.target.value)}
                  placeholder={p.name}
                />
              ))}
            </div>
          ))
        )}
      </div>
      <div className="px-4 py-2 border-t">
        <Button size="sm" variant="outline" onClick={handleAddRow}>+ 새 페이지</Button>
      </div>
      {/* 속성 추가 모달 */}
      {showPropertyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white rounded shadow-lg p-6 min-w-[320px]">
            <div className="mb-2 font-semibold">새 속성 추가</div>
            <div className="mb-2">
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="속성 이름"
                value={newPropertyName}
                onChange={e => setNewPropertyName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="mr-2">유형:</label>
              <select
                className="border rounded px-2 py-1"
                value={newPropertyType}
                onChange={e => setNewPropertyType(e.target.value)}
              >
                <option value="text">텍스트</option>
                <option value="number">숫자</option>
                <option value="tag">태그</option>
                <option value="date">날짜</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowPropertyModal(false)}>취소</Button>
              <Button size="sm" onClick={handleConfirmAddProperty}>추가</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 