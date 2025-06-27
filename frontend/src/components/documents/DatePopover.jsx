import React, { useRef, useEffect } from 'react';

export default function DatePopover({ value, onChange, onClose }) {
  const ref = useRef();
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute z-50 bg-white border rounded shadow p-2 mt-1">
      <input
        type="date"
        className="border rounded px-2 py-1"
        value={value ? value.slice(0, 10) : ''}
        onChange={e => onChange(e.target.value)}
        onBlur={onClose}
        autoFocus
      />
    </div>
  );
} 