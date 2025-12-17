export interface TagColor {
  name: string;
  value: string;
  bg: string;
  border: string;
}

export const TAG_COLORS: TagColor[] = [
  { name: '기본', value: 'default', bg: 'bg-gray-100', border: 'border-gray-300' },
  { name: '회색', value: 'gray', bg: 'bg-gray-200', border: 'border-gray-300' },
  { name: '갈색', value: 'brown', bg: 'bg-amber-100', border: 'border-amber-300' },
  { name: '주황색', value: 'orange', bg: 'bg-orange-100', border: 'border-orange-300' },
  { name: '노란색', value: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300' },
  { name: '초록색', value: 'green', bg: 'bg-green-100', border: 'border-green-300' },
  { name: '파란색', value: 'blue', bg: 'bg-blue-100', border: 'border-blue-300' },
  { name: '보라색', value: 'purple', bg: 'bg-purple-100', border: 'border-purple-300' },
  { name: '분홍색', value: 'pink', bg: 'bg-pink-100', border: 'border-pink-300' },
  { name: '빨간색', value: 'red', bg: 'bg-red-100', border: 'border-red-300' },
];

export function getColorObj(value: string): TagColor {
  return TAG_COLORS.find(c => c.value === value) || TAG_COLORS[0];
}
