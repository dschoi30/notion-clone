import React, { useRef, useEffect, useState } from 'react';

// 날짜/시간 선택 팝오버
// value: ISO-like string (e.g., '2025-08-01' or '2025-08-01T14:30')
export default function DatePopover({ value, onChange, onClose, enableTime = true }) {
  const ref = useRef();
  const [datePart, setDatePart] = useState('');
  const [timePart, setTimePart] = useState('');
  const [withTime, setWithTime] = useState(false);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [onClose]);

  // 초기 값 파싱
  useEffect(() => {
    if (!value) {
      setDatePart('');
      setTimePart('');
      setWithTime(false);
      return;
    }
    const [d, t] = String(value).split('T');
    setDatePart(d || '');
    if (t) {
      const hhmm = t.slice(0, 5); // HH:mm
      setTimePart(hhmm);
      setWithTime(true);
    } else {
      setTimePart('');
      setWithTime(false);
    }
  }, [value]);

  // 변경 헬퍼
  const emit = (nextDate, nextTime, includeTime) => {
    if (!nextDate) {
      onChange('');
      return;
    }
    if (enableTime && includeTime && nextTime) {
      onChange(`${nextDate}T${nextTime}`);
    } else {
      onChange(nextDate);
    }
  };

  return (
    <div ref={ref} className="absolute z-50 bg-white border rounded shadow p-2 mt-1 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={datePart}
          onChange={(e) => {
            const d = e.target.value;
            setDatePart(d);
            emit(d, timePart, withTime);
          }}
          autoFocus
        />
        {enableTime && (
          <label className="flex items-center gap-1 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={withTime}
              onChange={(e) => {
                const next = e.target.checked;
                setWithTime(next);
                emit(datePart, timePart, next);
              }}
            />
            시간 선택
          </label>
        )}
      </div>
      {enableTime && withTime && (
        <div className="flex items-center gap-2">
          <input
            type="time"
            className="border rounded px-2 py-1"
            value={timePart}
            onChange={(e) => {
              const t = e.target.value;
              setTimePart(t);
              emit(datePart, t, true);
            }}
          />
        </div>
      )}
    </div>
  );
}