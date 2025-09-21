import React from 'react';
import { Tooltip } from '@/components/ui/tooltip';

function getInitials(name, email) {
  const base = (name && name.trim().length > 0 ? name : (email || '')).trim();
  if (!base) return '?';
  const hasHangul = /[\uAC00-\uD7AF]/.test(base);
  if (hasHangul) {
    const match = base.match(/[\uAC00-\uD7AF]/);
    return match ? match[0] : base[0];
  }
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return base.substring(0, 2).toUpperCase();
}

export default function UserBadge({ name, email, profileImageUrl, size = 20, showLabel = true, xOffset = 0 }) {
  const initials = getInitials(name, email);
  const dimension = typeof size === 'number' ? `${size}px` : size;
  
  // 툴팁 내용 생성
  const getTooltipContent = () => {
    if (!name && !email) return null;
    if (name && email) {
      return (
        <>
          <div className="font-medium">{name}</div>
          <div className="text-xs opacity-90">{email}</div>
        </>
      );
    }
    return name || email;
  };

  const tooltipContent = getTooltipContent();
  
  return (
    <Tooltip content={tooltipContent} side="bottom" xOffset={xOffset}>
      <span className="inline-flex items-center gap-2 min-h-[20px] max-w-full overflow-hidden">
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={name || email || 'user'}
            style={{ width: dimension, height: dimension, borderRadius: '9999px', objectFit: 'cover' }}
          />
        ) : (
          <span
            aria-hidden
            className="inline-flex justify-center items-center text-base font-bold text-white bg-blue-700 rounded-full opacity-60 select-none"
            style={{ width: dimension, height: dimension, fontSize: '0.75rem' }}
          >
            {initials}
          </span>
        )}
        {showLabel && (
          <span className="text-sm text-gray-900 truncate">
            {name || email || ''}
          </span>
        )}
      </span>
    </Tooltip>
  );
}


