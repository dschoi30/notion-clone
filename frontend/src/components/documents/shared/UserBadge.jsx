import React from 'react';

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

export default function UserBadge({ name, email, profileImageUrl, size = 20 }) {
  const initials = getInitials(name, email);
  const dimension = typeof size === 'number' ? `${size}px` : size;
  return (
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
          className="inline-flex justify-center items-center text-base font-bold text-white bg-blue-500 rounded-full opacity-60 select-none"
          style={{ width: dimension, height: dimension, fontSize: '0.70rem' }}
        >
          {initials}
        </span>
      )}
      <span className="text-sm text-gray-900 truncate" title={name || email}>
        {name || email || ''}
      </span>
    </span>
  );
}


