import React from 'react';
import { Text, Hash, Calendar, Tag as TagIcon, User, Clock, Edit3 } from 'lucide-react';

export function getPropertyIcon(type) {
  switch (type) {
    case 'TEXT':
      return <Text className="inline mr-1" size={16} />;
    case 'NUMBER':
      return <Hash className="inline mr-1" size={16} />;
    case 'DATE':
      return <Calendar className="inline mr-1" size={16} />;
    case 'TAG':
      return <TagIcon className="inline mr-1" size={16} />;
    case 'CREATED_BY':
      return <User className="inline mr-1" size={16} />;
    case 'LAST_UPDATED_BY':
      return <User className="inline mr-1" size={16} />;
    case 'CREATED_AT':
      return <Clock className="inline mr-1" size={16} />;
    case 'LAST_UPDATED_AT':
      return <Clock className="inline mr-1" size={16} />;
    default:
      return null;
  }
}

export function slugify(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}