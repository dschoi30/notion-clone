import React, { useRef, useEffect, useState, KeyboardEvent, ChangeEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Pencil } from 'lucide-react';
import { TAG_COLORS as COLORS, getColorObj, type TagColor } from '@/lib/colors';
import { useDocumentPropertiesStore } from '@/hooks/useDocumentPropertiesStore';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { TagOption, PropertyValue } from '@/types';

interface TagPopoverProps {
  propertyId: number;
  tagOptions?: TagOption[];
  value: PropertyValue;
  position: { top: number; left: number; width: number; height: number } | null;
  onChange: (value: string) => void;
  onTagOptionsUpdate?: (tagOptions: TagOption[]) => void;
  onClose: () => void;
  onTabToNext?: () => void;
}

interface EditingTag {
  id: number;
  label: string;
  color?: string;
}

export default function TagPopover({ propertyId, tagOptions: propTagOptions, value, position, onChange, onTagOptionsUpdate, onClose, onTabToNext }: TagPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { currentWorkspace } = useWorkspace();
  const [tagOptions, setTagOptions] = useState<TagOption[]>(propTagOptions || []);
  const addTagOption = useDocumentPropertiesStore(state => state.addTagOption);
  const editTagOption = useDocumentPropertiesStore(state => state.editTagOption);
  const removeTagOption = useDocumentPropertiesStore(state => state.removeTagOption);

  useEffect(() => {
    if (propTagOptions) {
      setTagOptions(propTagOptions);
    }
  }, [propTagOptions]);

  // value는 id 또는 id 배열(JSON 문자열)
  const parseValue = (val: PropertyValue): number[] => {
    try {
      if (!val) return [];
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  };
  const [selectedIds, setSelectedIds] = useState<number[]>(() => parseValue(value));
  const [input, setInput] = useState<string>('');
  const [editingTag, setEditingTag] = useState<EditingTag | null>(null); // {id, label, color}
  const [inputFocused, setInputFocused] = useState<boolean>(false);
  const [editingTagOrigin, setEditingTagOrigin] = useState<TagOption | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(-1);
  const justOpened = useRef<boolean>(true);

  useEffect(() => {
    justOpened.current = true;
    function handleClick(e: Event) {
      if (justOpened.current) {
        return;
      }
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        console.log('TagPopover: 외부 클릭 감지, 닫힘');
        onClose();
      } else {
        console.log('TagPopover: 내부 클릭, 유지');
      }
    }
    // 캡처 단계에서 mousedown 사용
    document.addEventListener('mousedown', handleClick, true);
    // justOpened를 한 프레임 뒤에 false로 변경
    setTimeout(() => { justOpened.current = false; }, 0);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [onClose, position]);

  // 태그 추가 (기존 옵션 선택)
  const addTag = (option: TagOption) => {
    if (!option || selectedIds.includes(option.id)) return;
    const newIds = [...selectedIds, option.id];
    setSelectedIds(newIds);
    setInput('');
    if (onChange) onChange(JSON.stringify(newIds));
  };
  // 태그 삭제
  const removeTag = (id: number) => {
    const newIds = selectedIds.filter(tid => tid !== id);
    setSelectedIds(newIds);
    if (onChange) onChange(JSON.stringify(newIds));
  };

  // 태그 옵션 생성
  const handleCreateTagOption = async (label: string) => {
    if (!label.trim() || tagOptions.some(t => t.label === label.trim())) return;
    if (currentWorkspace?.id && propertyId) {
      const newOption = await addTagOption(currentWorkspace.id, propertyId, { label: label.trim(), color: 'default' });
      if (newOption) {
        const updatedTagOptions = [...tagOptions, newOption];
        setTagOptions(updatedTagOptions);
        const newIds = [...selectedIds, newOption.id];
        setSelectedIds(newIds);
        if (onChange) onChange(JSON.stringify(newIds));
        if (onTagOptionsUpdate) onTagOptionsUpdate(updatedTagOptions);
      }
    }
    setInput('');
  };

  // 태그 편집
  const handleEditTag = async (origin: TagOption | null, updated: EditingTag) => {
    if (currentWorkspace?.id && updated?.id) {
      const updatedOption = await editTagOption(currentWorkspace.id, updated.id, updated);
      console.log('updatedOption', updatedOption);
      if (updatedOption) {
        const updatedTagOptions = tagOptions.map(opt => opt.id === updatedOption.id ? updatedOption : opt);
        console.log('updatedTagOptions', updatedTagOptions);
        setTagOptions(updatedTagOptions);
        if (onTagOptionsUpdate) onTagOptionsUpdate(updatedTagOptions);
      }
    }
  };
  // 태그 옵션 삭제
  const handleRemoveTagOption = (origin: TagOption | null) => {
    if (currentWorkspace?.id && origin?.id) {
      removeTagOption(currentWorkspace.id, origin.id);
      const updatedTagOptions = tagOptions.filter(opt => opt.id !== origin.id);
      setTagOptions(updatedTagOptions);
      if (onTagOptionsUpdate) onTagOptionsUpdate(updatedTagOptions);
    }
  };

  // 선택된 태그 정보
  const selectedTags = tagOptions.filter(opt => selectedIds.includes(opt.id));

  const popover = (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        minWidth: position?.width ?? 200,
        width: position?.width ?? 200,
        zIndex: 20,
        // 기존 스타일 추가
      }}
      className="px-2 py-2 bg-white border shadow"
      onKeyDown={(e: KeyboardEvent) => {
        // 화살표 키, Tab, Enter, Escape 키는 팝오버 내에서만 처리하고 이벤트 전파 방지
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'].includes(e.key)) {
          e.stopPropagation();
        }
      }}
    >
      <div className="flex flex-wrap gap-1 items-center mb-2">
        {selectedTags.map(tag => {
          const colorObj = getColorObj(tag.color || 'default');
          return (
            <span key={tag.id} className={`inline-flex items-center px-2 py-0.5 rounded text-xs mr-1 ${colorObj.bg} border ${colorObj.border} relative`}>
              {tag.label}
              <button className="ml-1 text-gray-400 hover:text-red-500" onClick={() => removeTag(tag.id)}>
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
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setInput(e.target.value);
          setSelectedOptionIndex(-1); // 입력값 변경 시 선택 초기화
        }}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedOptionIndex >= 0 && selectedOptionIndex < tagOptions.length) {
              // 선택된 옵션이 있으면 해당 옵션 선택
              addTag(tagOptions[selectedOptionIndex]);
            } else {
              // 입력값이 기존 옵션이면 선택, 아니면 새 옵션 생성
              const found = tagOptions.find(opt => opt.label === input.trim());
              if (found) addTag(found);
              else handleCreateTagOption(input);
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedOptionIndex(prev => 
              prev < tagOptions.length - 1 ? prev + 1 : 0
            );
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedOptionIndex(prev => 
              prev > 0 ? prev - 1 : tagOptions.length - 1
            );
          } else if (e.key === 'Tab') {
            e.preventDefault();
            if (onTabToNext) {
              onTabToNext();
            } else {
              onClose();
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder="옵션 선택 또는 생성"
        autoFocus
        onFocus={() => setInputFocused(true)}
        onBlur={() => setTimeout(() => setInputFocused(false), 100)}
      />
      <div className="overflow-y-auto mt-2 max-h-40 text-sm bg-white rounded border shadow">
        {tagOptions.map((opt, index) => (
          <div
            key={opt.id}
            className={`flex items-center px-2 py-1 w-full hover:bg-blue-50 ${
              selectedOptionIndex === index ? 'bg-blue-100' : ''
            }`}
            onMouseDown={(e: MouseEvent) => e.preventDefault()}
            onClick={() => addTag(opt)}
            style={{ cursor: 'pointer' }}
          >
            <span className={`inline-block px-2 py-0.5 rounded ${getColorObj(opt.color || 'default').bg} text-xs mr-2`}>{opt.label}</span>
            <button
              className="ml-auto text-gray-400 hover:text-blue-500"
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                setEditingTag(opt);
                setEditingTagOrigin(opt);
              }}
              title="태그 편집"
            >
              <Pencil size={14} />
            </button>
          </div>
        ))}
      </div>
      {/* 미리보기 라벨 */}
      {input.trim() && !tagOptions.some(opt => opt.label === input.trim()) && (
        <div className="mt-2">
          <div className="mb-1 text-xs text-gray-500">옵션 선택 또는 생성</div>
          <button
            className="flex items-center px-2 py-1 w-full text-sm bg-gray-100 rounded border border-gray-200 hover:bg-blue-100"
            onClick={() => handleCreateTagOption(input)}
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingTag({ ...editingTag, label: e.target.value })}
            autoFocus
            placeholder="태그 이름"
            onBlur={() => editingTagOrigin && handleEditTag(editingTagOrigin, editingTag)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                editingTagOrigin && handleEditTag(editingTagOrigin, editingTag);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditingTag(null);
                setEditingTagOrigin(null);
              }
            }}
          />
          {/* 삭제 버튼 */}
          <button
            className="flex gap-2 items-center px-2 py-1 mb-2 w-full text-sm text-gray-700 rounded transition hover:text-red-500 hover:bg-red-50"
            style={{ minHeight: 32 }}
            onClick={() => {
              if (editingTagOrigin) {
                handleRemoveTagOption(editingTagOrigin);
                removeTag(editingTag.id);
                // setEditingTag(null);
              }
            }}
          >
            <Trash2 size={16} />
            <span className="font-medium">삭제</span>
          </button>
          {/* 색상 구분선 및 텍스트 */}
          <div className="flex items-center my-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="mx-2 text-xs text-gray-500 whitespace-nowrap">색</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="flex flex-col gap-1">
            {COLORS.map((c: TagColor) => (
              <button
                key={c.value}
                className={`flex items-center w-full px-2 py-1 rounded transition text-left text-sm ${editingTag.color === c.value ? 'bg-blue-100' : ''} hover:bg-blue-50`}
                style={{ minHeight: 28 }}
                onClick={() => {
                  const updated = { ...editingTag, color: c.value };
                  setEditingTag(updated);
                  if (editingTagOrigin) {
                    handleEditTag(editingTagOrigin, updated);
                  }
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
  return createPortal(popover, document.body);
}

