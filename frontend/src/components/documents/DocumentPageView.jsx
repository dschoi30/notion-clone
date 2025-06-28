import React from 'react';
import AddPropertyPopover from './AddPropertyPopover';
import { Button } from '@/components/ui/button';
import Editor from '@/components/editor/Editor';
import dayjs from 'dayjs';
import { getColorObj } from '@/lib/colors';

const DocumentPageView = ({
  properties,
  propertyValues,
  addPropBtnRef,
  isAddPropOpen,
  setIsAddPropOpen,
  handleAddProperty,
  content,
  handleContentChange,
  editorRef,
  isReadOnly,
  isInitial,
  handleChangeViewType
}) => {
  return (
    <>
      {/* 속성명/값 목록 + 속성 추가 버튼 (PAGE에서만) */}
      {properties.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mb-2">
          {properties.map((prop) => {
            let value = propertyValues[prop.id] || '';
            let content = null;
            if (prop.type === 'DATE' || prop.type === 'CREATED_AT' || prop.type === 'LAST_UPDATED_AT') {
              content = value ? dayjs(value).locale('ko').format('YYYY년 M월 D일') : '';
            } else if (prop.type === 'TAG') {
              let tags = [];
              try { tags = value ? JSON.parse(value) : []; } catch {}
              content = (
                <div className="flex gap-1">
                  {tags.map(tag => {
                    const colorObj = getColorObj(tag.color || 'default');
                    return (
                      <span
                        key={tag.label}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs ${colorObj.bg} border ${colorObj.border}`}
                        style={{ whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {tag.label}
                      </span>
                    );
                  })}
                </div>
              );
            } else {
              content = value;
            }
            return (
              <div key={prop.id} className="flex flex-col items-start min-w-[120px]">
                <span className="text-xs text-gray-500 font-medium mb-0.5">{prop.name}</span>
                <span className="text-sm text-gray-900">{content}</span>
              </div>
            );
          })}
          {/* 속성 추가 버튼 */}
          <div className="relative">
            <Button ref={addPropBtnRef} size="sm" variant="ghost" className="ml-2" onClick={() => setIsAddPropOpen(v => !v)}>
              + 속성 추가
            </Button>
            {isAddPropOpen && (
              <div className="absolute left-0 top-full z-10 mt-1" >
                <AddPropertyPopover onAddProperty={handleAddProperty} />
              </div>
            )}
          </div>
        </div>
      )}
      {/* 에디터 */}
      <Editor 
        content={content} 
        onUpdate={handleContentChange}
        ref={editorRef}
        editable={!isReadOnly}
      />
      {/* 최초 생성 상태에서만 하단 버튼 노출 */}
      {isInitial && (
        <div className="flex gap-2 mt-4">
          <Button onClick={() => handleChangeViewType('TABLE')} variant="outline">테이블</Button>
          <Button onClick={() => handleChangeViewType('GALLERY')} variant="outline">갤러리</Button>
        </div>
      )}
    </>
  );
};

export default DocumentPageView; 