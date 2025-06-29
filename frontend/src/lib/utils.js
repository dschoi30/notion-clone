import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function slugify(text) {
  return text
    .toString()
    .trim()
    .replace(/\s+/g, '-')           // 공백을 -로
    .replace(/[^\w\-가-힣]/g, '')   // 한글, 영문, 숫자, -만 허용
    .replace(/-+/g, '-')             // 여러 -를 하나로
    .replace(/^-+|-+$/g, '');        // 양쪽 - 제거
}
