import React from 'react';

function getInitials(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return '?';
  
  const hasHangul = /[\uAC00-\uD7AF]/.test(trimmed);
  if (hasHangul) {
    const match = trimmed.match(/[\uAC00-\uD7AF]/);
    return match ? match[0] : trimmed[0];
  }
  
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.substring(0, 2).toUpperCase();
}

export default function WorkspaceIcon({ name, iconUrl, size = 32, showLabel = true, className = '' }) {
  const initials = getInitials(name);
  const dimension = typeof size === 'number' ? `${size}px` : size;
  
  return (
    <span className={`inline-flex items-center gap-2 min-h-[20px] max-w-full overflow-hidden ${className}`}>
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={name || 'workspace'}
          style={{ width: dimension, height: dimension, borderRadius: '6px', objectFit: 'cover' }}
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex justify-center items-center text-base font-bold text-white bg-blue-600 rounded-md opacity-90 select-none"
          style={{ width: dimension, height: dimension, fontSize: '0.75rem' }}
        >
          {initials}
        </span>
      )}
      {showLabel && (
        <span className="text-sm text-gray-900 truncate" title={name}>
          {name || ''}
        </span>
      )}
    </span>
  );
}