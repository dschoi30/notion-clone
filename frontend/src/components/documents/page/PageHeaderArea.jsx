import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

function PageHeaderArea({ addBtnRef, isAddOpen, setIsAddOpen, AddPropertyPopoverComponent, stickToBottom = false }) {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isAddOpen) return;
    const onDocMouseDown = (e) => {
      const popoverEl = popoverRef.current;
      const btnEl = addBtnRef?.current;
      const target = e.target;
      const insidePopover = popoverEl && popoverEl.contains(target);
      const onButton = btnEl && btnEl.contains(target);
      if (!insidePopover && !onButton) setIsAddOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    return () => document.removeEventListener('mousedown', onDocMouseDown, true);
  }, [isAddOpen, setIsAddOpen, addBtnRef]);

  return (
    <div className="relative py-2">
      <Button ref={addBtnRef} size="sm" variant="ghost" className="px-2 text-sm text-gray-500" onClick={() => setIsAddOpen((v) => !v)}>
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


