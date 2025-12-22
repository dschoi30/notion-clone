import type { Permission } from '@/types';

export interface UserDisplay {
  name: string;
  email: string;
  profileImageUrl?: string;
}

export function resolveUserDisplay(
  rawValue: string | null | undefined,
  permissions: Permission[] = []
): UserDisplay {
  const value = rawValue || '';
  if (!value) return { name: '', email: '', profileImageUrl: undefined };
  const matched = permissions.find(
    (p) => p?.email === value || (p?.name && p.name === value)
  );
  if (matched) {
    return {
      name: matched.name || '',
      email: matched.email || '',
      profileImageUrl: matched.profileImageUrl,
    };
  }
  // Fallback: if looks like email, show via email; else treat as name
  const looksLikeEmail = typeof value === 'string' && value.includes('@');
  return {
    name: looksLikeEmail ? '' : value,
    email: looksLikeEmail ? value : '',
    profileImageUrl: undefined,
  };
}

