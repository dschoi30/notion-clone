import { describe, it, expect } from 'vitest';
import { cn, slugify, formatKoreanDateTime, formatKoreanDateSmart } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('여러 클래스를 병합한다', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('조건부 클래스를 처리한다', () => {
      expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
    });

    it('중복 클래스를 제거한다', () => {
      expect(cn('px-2 py-1', 'px-4')).toContain('py-1');
      expect(cn('px-2 py-1', 'px-4')).toContain('px-4');
      expect(cn('px-2 py-1', 'px-4')).not.toContain('px-2');
    });

    it('빈 값은 무시한다', () => {
      expect(cn('foo', '', null, undefined, false)).toBe('foo');
    });
  });

  describe('slugify', () => {
    it('공백을 하이픈으로 변환한다', () => {
      expect(slugify('hello world')).toBe('hello-world');
    });

    it('여러 공백을 하나의 하이픈으로 변환한다', () => {
      expect(slugify('hello   world')).toBe('hello-world');
    });

    it('특수문자를 제거한다', () => {
      expect(slugify('hello@world#test')).toBe('helloworldtest');
    });

    it('한글을 유지한다', () => {
      expect(slugify('안녕하세요')).toBe('안녕하세요');
    });

    it('영문, 숫자, 하이픈, 한글만 유지한다', () => {
      expect(slugify('hello-world-123-안녕')).toBe('hello-world-123-안녕');
    });

    it('양쪽 하이픈을 제거한다', () => {
      expect(slugify('-hello-world-')).toBe('hello-world');
    });

    it('여러 하이픈을 하나로 변환한다', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });

    it('숫자를 문자열로 변환한다', () => {
      expect(slugify(123)).toBe('123');
    });

    it('빈 문자열을 처리한다', () => {
      expect(slugify('')).toBe('');
    });
  });

  describe('formatKoreanDateTime', () => {
    it('날짜와 시간을 한국어 형식으로 포맷한다', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatKoreanDateTime(date);
      expect(result).toContain('2024년');
      expect(result).toContain('1월');
      expect(result).toContain('15일');
      expect(result).toContain('오후');
    });

    it('오전 시간을 올바르게 표시한다', () => {
      const date = new Date('2024-01-15T09:30:00');
      const result = formatKoreanDateTime(date);
      expect(result).toContain('오전');
    });

    it('오후 시간을 올바르게 표시한다', () => {
      const date = new Date('2024-01-15T15:30:00');
      const result = formatKoreanDateTime(date);
      expect(result).toContain('오후');
    });

    it('정오(12시)를 올바르게 표시한다', () => {
      const date = new Date('2024-01-15T12:00:00');
      const result = formatKoreanDateTime(date);
      expect(result).toContain('오후 12');
    });

    it('자정(0시)을 올바르게 표시한다', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = formatKoreanDateTime(date);
      expect(result).toContain('오전 12');
    });

    it('문자열 날짜를 처리한다', () => {
      const result = formatKoreanDateTime('2024-01-15T14:30:00');
      expect(result).toContain('2024년');
    });

    it('null이나 undefined를 빈 문자열로 반환한다', () => {
      expect(formatKoreanDateTime(null)).toBe('');
      expect(formatKoreanDateTime(undefined)).toBe('');
    });
  });

  describe('formatKoreanDateSmart', () => {
    it('시간이 포함된 날짜는 formatKoreanDateTime 형식으로 반환한다', () => {
      const date = '2024-01-15T14:30:00';
      const result = formatKoreanDateSmart(date);
      expect(result).toContain('오후');
    });

    it('시간이 없는 날짜는 날짜만 표시한다', () => {
      const date = '2024-01-15';
      const result = formatKoreanDateSmart(date);
      expect(result).toContain('2024년');
      expect(result).toContain('1월');
      expect(result).toContain('15일');
      expect(result).not.toContain('오전');
      expect(result).not.toContain('오후');
    });

    it('ISO 형식 문자열을 처리한다', () => {
      const date = '2024-01-15T00:00:00.000Z';
      const result = formatKoreanDateSmart(date);
      expect(result).toContain('2024년');
    });

    it('Date 객체를 처리한다', () => {
      const date = new Date('2024-01-15T14:30:00');
      const result = formatKoreanDateSmart(date);
      expect(result).toContain('2024년');
    });

    it('null이나 undefined를 빈 문자열로 반환한다', () => {
      expect(formatKoreanDateSmart(null)).toBe('');
      expect(formatKoreanDateSmart(undefined)).toBe('');
    });
  });
});

