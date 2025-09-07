import React, { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const PRESETS = [
  { label: '오늘', value: 'today' },
  { label: '이번 주', value: 'week' },
  { label: '이번 달', value: 'month' },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(day, start, end) {
  if (!start || !end) return false;
  const d = day.getTime();
  return start.getTime() < d && d < end.getTime();
}

export function getDateLabel(selected) {
  if (!selected) return '';
  if (selected.type === 'custom') {
    if (selected.range && selected.range.start && selected.range.end) {
      const s = selected.range.start;
      const e = selected.range.end;
      return `${s.getFullYear()}.${s.getMonth()+1}.${s.getDate()}~${e.getFullYear()}.${e.getMonth()+1}.${e.getDate()}`;
    }
    if (selected.date) {
      const d = selected.date;
      return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
    }
  }
  if (selected === 'today') return '오늘';
  if (selected === 'week') return '이번 주';
  if (selected === 'month') return '이번 달';
  return '';
}

export default function DateFilterModal({ open, onClose, onSelect, anchorRef, selected, dateType, onDateTypeChange }) {
  const modalRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, minWidth: 180 });
  const today = new Date();
  const [range, setRange] = useState({ start: null, end: null });
  const [calendar, setCalendar] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const dateTypeLabel = dateType === 'created' ? '생성일' : '최종 편집일';
  const dateTypeOptions = [
    { value: 'created', label: '생성일' },
    { value: 'edited', label: '최종 편집일' },
  ];
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current || !modalRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      minWidth: rect.width || 180,
    });
  }, [open, anchorRef]);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        modalRef.current && !modalRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [open, onClose, anchorRef]);

  function handleDatePick(day) {
    const picked = new Date(calendar.year, calendar.month, day);
    if (!range.start || (range.start && range.end)) {
      setRange({ start: picked, end: null });
    } else if (range.start && !range.end) {
      if (picked.getTime() < range.start.getTime()) {
        setRange({ start: picked, end: range.start });
        onSelect({ type: 'custom', range: { start: picked, end: range.start } });
      } else if (picked.getTime() === range.start.getTime()) {
        setRange({ start: picked, end: picked });
        onSelect({ type: 'custom', date: picked });
        onClose();
      } else {
        setRange({ start: range.start, end: picked });
        onSelect({ type: 'custom', range: { start: range.start, end: picked } });
      }
    }
  }

  function handlePresetClick(opt) {
    let newRange = { start: null, end: null };
    let newCalendar = { ...calendar };
    if (opt.value === 'today') {
      const t = new Date();
      newRange = { start: t, end: t };
      newCalendar = { year: t.getFullYear(), month: t.getMonth() };
    } else if (opt.value === 'week') {
      const t = new Date();
      const day = t.getDay();
      const start = new Date(t);
      start.setDate(t.getDate() - day);
      const end = new Date(t);
      end.setDate(t.getDate() + (6 - day));
      newRange = { start, end };
      newCalendar = { year: start.getFullYear(), month: start.getMonth() };
    } else if (opt.value === 'month') {
      const t = new Date();
      const start = new Date(t.getFullYear(), t.getMonth(), 1);
      const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
      newRange = { start, end };
      newCalendar = { year: start.getFullYear(), month: start.getMonth() };
    }
    setRange(newRange);
    setCalendar(newCalendar);
    onSelect(opt.value);
    onClose();
  }

  function handleReset() {
    setRange({ start: null, end: null });
    onSelect(null);
  }

  const days = getDaysInMonth(calendar.year, calendar.month);
  const firstDay = new Date(calendar.year, calendar.month, 1).getDay();

  if (!open) return null;

  return createPortal(
    <div
      ref={modalRef}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        minWidth: position.minWidth,
        zIndex: 9998,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}
      className="p-2 bg-white rounded-lg border border-gray-200"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="relative">
          <button
            className="flex items-center px-2 py-1 text-xs bg-white hover:bg-gray-50"
            onClick={() => setDropdownOpen(v => !v)}
            type="button"
          >
            {dateTypeLabel}
            <svg className="ml-1 w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {dropdownOpen && (
            <ul className="absolute left-0 z-10 mt-1 w-24 bg-white rounded border shadow">
              {dateTypeOptions.map(opt => (
                <li
                  key={opt.value}
                  className={`w-24 px-3 py-1 text-xs cursor-pointer hover:bg-gray-200 ${dateType === opt.value ? 'bg-gray-100' : ''}`}
                  onClick={() => { onDateTypeChange(opt.value); setDropdownOpen(false); }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          className="px-2 py-1 text-xs rounded hover:bg-gray-200"
          onClick={handleReset}
        >
          초기화
        </button>
      </div>
      <ul className="overflow-y-auto divide-y divide-gray-100 min-w-[160px]">
        {PRESETS.map(opt => (
          <li
            key={opt.value}
            className={`py-1 px-2 cursor-pointer rounded ${selected && selected.type === 'custom' ? '' : opt.value === selected ? 'bg-gray-100' : 'hover:bg-gray-200'}`}
            onClick={() => handlePresetClick(opt)}
          >
            {opt.label}
          </li>
        ))}
      </ul>
      <div className="p-2 mt-2 bg-gray-50 rounded border">
        <div className="flex justify-between items-center mb-2">
          <button onClick={() => setCalendar(c => ({ ...c, month: c.month === 0 ? 11 : c.month - 1, year: c.month === 0 ? c.year - 1 : c.year }))}>&lt;</button>
          <span>{calendar.year}년 {calendar.month + 1}월</span>
          <button onClick={() => setCalendar(c => ({ ...c, month: c.month === 11 ? 0 : c.month + 1, year: c.month === 11 ? c.year + 1 : c.year }))}>&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-0 mb-1 text-xs text-center text-gray-500">
          <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
        </div>
        <div className="grid grid-cols-7 gap-0">
          {Array(firstDay).fill(0).map((_, i) => <div key={i}></div>)}
          {Array(days).fill(0).map((_, i) => {
            const d = new Date(calendar.year, calendar.month, i+1);
            const isToday = isSameDay(d, today);
            const isStart = range.start && isSameDay(d, range.start);
            const isEnd = range.end && isSameDay(d, range.end);
            const inRange = range.start && range.end && isInRange(d, range.start, range.end);
            if (inRange && isToday) {
              return (
                <button
                  key={i+1}
                  className="relative p-0 w-7 h-7"
                  onClick={() => handleDatePick(i+1)}
                >
                  <div className="absolute inset-0 bg-blue-100"></div>
                  <span className="flex relative z-10 justify-center items-center w-7 h-7 text-white bg-red-500 rounded-full">{i+1}</span>
                </button>
              );
            }
            let btnClass = 'w-7 h-7 ';
            if (isStart && isEnd) btnClass += 'bg-blue-500 text-white rounded-md';
            else if (isStart) btnClass += 'bg-blue-500 text-white rounded-l-md';
            else if (isEnd) btnClass += 'bg-blue-400 text-blue-700 rounded-r-md';
            else if (isToday) btnClass += 'bg-red-500 text-white rounded-full';
            else if (inRange) btnClass += 'bg-blue-100 text-blue-700';
            else btnClass += 'hover:bg-blue-100 rounded-md';
            return (
              <button
                key={i+1}
                className={btnClass}
                onClick={() => handleDatePick(i+1)}
              >
                {i+1}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
} 