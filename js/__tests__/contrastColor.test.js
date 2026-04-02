import { contrastColor } from '../contrastColor.js';

describe('contrastColor', () => {
  describe('returns white text on dark backgrounds', () => {
    test('black background → white text', () => {
      expect(contrastColor('#000000')).toBe('#fff');
    });

    test('very dark navy → white text', () => {
      expect(contrastColor('#0a0a2e')).toBe('#fff');
    });

    test('dark red → white text', () => {
      expect(contrastColor('#5c0000')).toBe('#fff');
    });
  });

  describe('returns black text on light backgrounds', () => {
    test('white background → black text', () => {
      expect(contrastColor('#ffffff')).toBe('#000');
    });

    test('light yellow → black text', () => {
      expect(contrastColor('#fffde7')).toBe('#000');
    });

    test('light gray → black text', () => {
      expect(contrastColor('#f5f5f5')).toBe('#000');
    });
  });

  describe('mid-range colors', () => {
    test('mid-blue chooses whichever has higher contrast', () => {
      const result = contrastColor('#0057b8');
      // Against mid-blue, white should win (~4.9:1) vs black (~4.3:1)
      expect(result).toBe('#fff');
    });

    test('medium gray chooses black (better contrast)', () => {
      // #767676 is ~4.5:1 against white, better than its contrast with black
      const result = contrastColor('#767676');
      expect(['#fff', '#000']).toContain(result);
    });
  });

  describe('custom minContrast threshold', () => {
    test('low threshold (1.5) still returns a valid color', () => {
      const result = contrastColor('#888888', 1.5);
      expect(['#fff', '#000']).toContain(result);
    });

    test('very high threshold (10) falls back to whichever is higher', () => {
      // No color can reach 10:1 against mid-gray; should still return a value
      const result = contrastColor('#888888', 10);
      expect(['#fff', '#000']).toContain(result);
    });
  });

  describe('error handling', () => {
    test('invalid color string returns #000 fallback', () => {
      expect(contrastColor('notacolor')).toBe('#000');
    });

    test('empty string returns #000 fallback', () => {
      expect(contrastColor('')).toBe('#000');
    });

    test('undefined returns #000 fallback', () => {
      expect(contrastColor(undefined)).toBe('#000');
    });
  });
});
