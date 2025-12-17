import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugify(text: string | number): string {
  return text
    .toString()
    .trim()
    .replace(/\s+/g, '-')           // 공백을 -로
    .replace(/[^\w\-가-힣]/g, '')   // 한글, 영문, 숫자, -만 허용
    .replace(/-+/g, '-')             // 여러 -를 하나로
    .replace(/^-+|-+$/g, '');        // 양쪽 - 제거
}

export function formatKoreanDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return '';
  const d = dayjs(dt).locale('ko');
  const hour = d.hour();
  const ampm = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${d.year()}년 ${d.month() + 1}월 ${d.date()}일 ${ampm} ${hour12}:${d.format('mm')}`;
}

// 날짜 문자열에 시간이 포함되지 않으면 'YYYY년 M월 D일' 형식으로만 표기
// 시간이 포함되면 formatKoreanDateTime 형식으로 표기
export function formatKoreanDateSmart(dt: string | Date | null | undefined): string {
  if (!dt) return '';
  const hasTime = typeof dt === 'string' && dt.includes('T') && dt.split('T')[1].length >= 4;
  if (!hasTime) {
    const d = dayjs(dt).locale('ko');
    return `${d.year()}년 ${d.month() + 1}월 ${d.date()}일`;
  }
  return formatKoreanDateTime(dt);
}
