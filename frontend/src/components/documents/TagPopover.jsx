import React, { useRef, useEffect, useState } from 'react';
import { X, Trash2, Info, Pencil } from 'lucide-react';
import { TAG_COLORS as COLORS, getColorObj } from '@/lib/colors';

export default function TagPopover({ value, options = [], onAddOption, onEditOption, onRemoveOption, onChange, onClose }) {
  const ref = useRef();
  
  const [tags, setTags] = useState(() => {
    try {
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [editingTag, setEditingTag] = useState(null); // {label, color}
  const [inputFocused, setInputFocused] = useState(false);
  const [editingTagOrigin, setEditingTagOrigin] = useState(null); // Added for editingTagOrigin

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // 태그 추가
  const addTag = (label, color = 'default') => {
    if (!label.trim() || tags.some(t => t.label === label.trim())) return;
    const newTag = { label: label.trim(), color };
    setTags([...tags, newTag]);
    setInput('');
    if (onAddOption) onAddOption(newTag);
  };
  // 태그 삭제
  const removeTag = (label) => setTags(tags.filter(t => t.label !== label));

  // 엔터로 태그 추가
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      addTag(input);
    }
  };

  // 팝오버 닫힐 때 값 반영
  useEffect(() => {
    return () => { onChange(JSON.stringify(tags)); };
    // eslint-disable-next-line
  }, [tags]);

  // 미리보기 라벨(입력값이 있고, 중복이 아닐 때)
  const showPreview = input.trim() && !tags.some(t => t.label === input.trim());
  // 드롭다운 후보: options 전체
  const filteredOptions = options;
  return (
    <div ref={ref} style={{ position: 'absolute', top: 0, left: 0, minWidth: '100%', zIndex: 9999 }} className="p-2 bg-white rounded border shadow">
      <div className="flex flex-wrap gap-1 items-center mb-2">
        {tags.map(tag => {
          const colorObj = getColorObj(tag.color);
          return (
            <span key={tag.label} className={`inline-flex items-center px-2 py-0.5 rounded text-xs mr-1 ${colorObj.bg} border ${colorObj.border} relative`}>
              {tag.label}
              <button className="ml-1 text-gray-400 hover:text-red-500" onClick={() => removeTag(tag.label)}>
                <X size={14} />
              </button>
            </span>
          );
        })}
      </div>
      <input
        type="text"
        className="px-2 py-1 w-full rounded border"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder="옵션 선택 또는 생성"
        autoFocus
        onFocus={() => setInputFocused(true)}
        onBlur={() => setTimeout(() => setInputFocused(false), 100)}
      />
      {/* 자동완성 드롭다운 */}
      {inputFocused && filteredOptions.length > 0 && (
        <div className="overflow-y-auto mt-2 max-h-40 text-sm bg-white rounded border shadow">
          {filteredOptions.map(opt => {
            const isSelected = tags.some(t => t.label === opt.label);
            return (
              <div
                key={opt.label}
                className={`flex items-center px-2 py-1 w-full hover:bg-blue-50`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { if (isSelected) return; addTag(opt.label, opt.color); }}
                style={{ cursor: isSelected ? 'default' : 'pointer' }}
              >
                <span className={`inline-block px-2 py-0.5 rounded ${getColorObj(opt.color).bg} text-xs mr-2`}>{opt.label}</span>
                <button
                  className="ml-auto text-gray-400 hover:text-blue-500"
                  onClick={e => {
                    e.stopPropagation();
                    let color = opt.color;
                    if (!color && opt.label) {
                      const found = COLORS.find(c => c.value === opt.value);
                      color = found ? found.value : 'default';
                    }
                    setEditingTag({ label: opt.label, color: color || 'default' });
                    setEditingTagOrigin({ label: opt.label, color: color || 'default' });
                  }}
                  title="태그 편집"
                >
                  <Pencil size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {/* 미리보기 라벨 */}
      {showPreview && (
        <div className="mt-2">
          <div className="mb-1 text-xs text-gray-500">옵션 선택 또는 생성</div>
          <button
            className="flex items-center px-2 py-1 w-full text-sm bg-gray-100 rounded border border-gray-200 hover:bg-blue-100"
            onClick={() => addTag(input)}
          >
            <span className="mr-2 text-gray-500">생성</span>
            <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold">{input.trim()}</span>
          </button>
        </div>
      )}
      {/* 연필 클릭 시 아래 UI만 노출 */}
      {editingTag && (
        <div className="absolute right-0 top-10 bg-white border rounded shadow-lg p-2 z-50 min-w-[200px] max-w-xs" style={{ fontSize: '14px' }}>
          {/* 태그 이름 인풋 */}
          <input
            className="px-2 py-1 mb-2 w-full text-sm rounded border"
            value={editingTag.label}
            onChange={e => setEditingTag({ ...editingTag, label: e.target.value })}
            autoFocus
            placeholder="태그 이름"
            onBlur={() => {
              if (onEditOption) onEditOption(editingTagOrigin, editingTag);
              // setEditingTag(null);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (onEditOption) onEditOption(editingTagOrigin, editingTag);
                // setEditingTag(null);
              }
            }}
          />
          {/* 삭제 버튼 */}
          <button
            className="flex gap-2 items-center px-2 py-1 mb-2 w-full text-sm text-gray-700 rounded transition hover:text-red-500 hover:bg-red-50"
            style={{ minHeight: 32 }}
            onClick={() => {
              if (onRemoveOption) onRemoveOption(editingTagOrigin);
              removeTag(editingTag.label);
              setEditingTag(null);
            }}
          >
            <Trash2 size={16} />
            <span className="font-medium">삭제</span>
          </button>
          {/* 색상 구분선 및 텍스트 */}
          <div className="flex items-center my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="mx-2 text-xs text-gray-500 whitespace-nowrap">색</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="flex flex-col gap-1">
            {COLORS.map(c => (
              <button
                key={c.value}
                className={`flex items-center w-full px-2 py-1 rounded transition text-left text-sm ${editingTag.color === c.value ? 'bg-gray-100' : ''} hover:bg-gray-50`}
                style={{ minHeight: 32 }}
                onClick={() => {
                  const updated = { ...editingTag, color: c.value };
                  setEditingTag(updated);
                  if (onEditOption) onEditOption(editingTagOrigin, updated);
                  // label이 같은 모든 태그의 color를 최신값으로 교체
                  const newTags = tags.map(t =>
                    t.label === updated.label ? { ...t, color: updated.color } : t
                  );
                  setTags(newTags);
                  if (onChange) onChange(JSON.stringify(newTags));
                }}
              >
                <span className={`w-5 h-5 rounded-md border mr-2 flex-shrink-0 ${c.bg} ${c.border}`}></span>
                <span className="flex-1 text-gray-800">{c.name}</span>
                {editingTag.color === c.value && <span className="ml-2 text-base">✔</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 