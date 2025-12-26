import { useEffect, useRef, useState, useCallback, MouseEvent } from 'react';
import { updatePropertyWidth } from '@/services/documentApi';
import { useThrottle } from '@/hooks/useThrottle';
import type { DocumentProperty } from '@/types';

interface UseColumnResizeParams {
  properties: DocumentProperty[];
  titleWidth: number;
  propertyWidths: number[];
  workspaceId: number;
  documentId: number;
  updateTitleWidthFn: (workspaceId: number, documentId: number, width: number) => Promise<void>;
}

export function useColumnResize({
  properties,
  titleWidth,
  propertyWidths,
  workspaceId,
  documentId,
  updateTitleWidthFn,
}: UseColumnResizeParams) {
  const defaultColWidths = [titleWidth, ...propertyWidths];
  const [colWidths, setColWidths] = useState<number[]>(defaultColWidths);
  const liveWidths = useRef<number[]>(colWidths);
  const resizingCol = useRef<number | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  useEffect(() => {
    const initial = [titleWidth, ...propertyWidths];
    setColWidths(initial);
    liveWidths.current = initial;
  }, [titleWidth, propertyWidths.join(','), properties.length]);

  const handleResizeMouseDown = (e: MouseEvent<HTMLDivElement>, colIdx: number) => {
    resizingCol.current = colIdx;
    startX.current = e.clientX;
    startWidth.current = colWidths[colIdx];
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
  };

  // 쓰로틀링된 마우스 이동 핸들러 (16ms = 60fps)
  const throttledMouseMove = useThrottle((e: MouseEvent) => {
    if (resizingCol.current == null) return;
    const dx = e.clientX - startX.current;
    const newWidth = Math.max(100, startWidth.current + dx);
    setColWidths((prev) => {
      const next = [...prev];
      next[resizingCol.current!] = newWidth;
      return next;
    });
    liveWidths.current[resizingCol.current] = newWidth;
  }, 16);

  const handleResizeMouseMove = useCallback((e: Event) => {
    throttledMouseMove(e as unknown as MouseEvent);
  }, [throttledMouseMove]);

  const handleResizeMouseUp = async () => {
    if (resizingCol.current == null) return;
    const colIdx = resizingCol.current;
    const width = liveWidths.current[colIdx];
    try {
      if (colIdx === 0) {
        if (typeof updateTitleWidthFn === 'function') {
          await updateTitleWidthFn(workspaceId, documentId, width);
        }
      } else {
        const property = properties[colIdx - 1];
        if (property) {
          await updatePropertyWidth(workspaceId, property.id, width);
        }
      }
    } catch (e) {
      console.error('컬럼 크기 업데이트 실패:', e);
    }
    resizingCol.current = null;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleResizeMouseMove);
    window.removeEventListener('mouseup', handleResizeMouseUp);
  };

  return { colWidths, handleResizeMouseDown };
}

