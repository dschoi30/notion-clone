import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface PageHeaderAreaProps {
  addBtnRef: React.RefObject<HTMLButtonElement>;
  isAddOpen: boolean;
  setIsAddOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  AddPropertyPopoverComponent: React.ComponentType;
}

function PageHeaderArea({ addBtnRef, isAddOpen, setIsAddOpen, AddPropertyPopoverComponent }: PageHeaderAreaProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAddOpen) return;
    const onDocMouseDown = (e: Event) => {
      const popoverEl = popoverRef.current;
      const btnEl = addBtnRef?.current;
      const target = e.target as Node;
      const insidePopover = popoverEl && popoverEl.contains(target);
      const onButton = btnEl && btnEl.contains(target);
      if (!insidePopover && !onButton) setIsAddOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    return () => document.removeEventListener('mousedown', onDocMouseDown, true);
  }, [isAddOpen, setIsAddOpen, addBtnRef]);

  return (
    <div className="relative py-2">
      <Button ref={addBtnRef} size="sm" variant="ghost" className={'px-2 text-sm text-gray-500'} 
        onClick={() => setIsAddOpen((v) => !v)}>
        + 속성 추가
      </Button>
      {isAddOpen && (
        <div ref={popoverRef} className="absolute left-0 top-full z-10 mt-1">
          <AddPropertyPopoverComponent />
        </div>
      )}
    </div>
  );
}

export default PageHeaderArea;

