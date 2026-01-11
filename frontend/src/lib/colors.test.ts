import { describe, it, expect } from 'vitest';
import { TAG_COLORS, getColorObj } from './colors';

describe('colors', () => {
  describe('TAG_COLORS', () => {
    it('모든 색상이 올바른 구조를 가진다', () => {
      TAG_COLORS.forEach(color => {
        expect(color).toHaveProperty('name');
        expect(color).toHaveProperty('value');
        expect(color).toHaveProperty('bg');
        expect(color).toHaveProperty('border');
      });
    });

    it('기본 색상이 포함되어 있다', () => {
      const defaultColor = TAG_COLORS.find(c => c.value === 'default');
      expect(defaultColor).toBeDefined();
      expect(defaultColor?.name).toBe('기본');
    });
  });

  describe('getColorObj', () => {
    it('존재하는 색상 값을 찾아 반환한다', () => {
      const color = getColorObj('blue');
      expect(color).toBeDefined();
      expect(color.value).toBe('blue');
      expect(color.name).toBe('파란색');
    });

    it('존재하지 않는 색상 값은 기본 색상을 반환한다', () => {
      const color = getColorObj('nonexistent');
      expect(color).toBeDefined();
      expect(color.value).toBe('default');
      expect(color.name).toBe('기본');
    });

    it('빈 문자열은 기본 색상을 반환한다', () => {
      const color = getColorObj('');
      expect(color.value).toBe('default');
    });

    it('모든 색상 값에 대해 올바른 객체를 반환한다', () => {
      TAG_COLORS.forEach(expectedColor => {
        const color = getColorObj(expectedColor.value);
        expect(color.value).toBe(expectedColor.value);
        expect(color.name).toBe(expectedColor.name);
      });
    });
  });
});

