import chroma from 'chroma-js';
import { adjustLuminanceToContrast } from '../adjustLuminanceToContrast.js';

// Helper: compute WCAG contrast ratio between two hex colors
function contrast(fg, bg) {
  return chroma.contrast(fg, bg);
}

describe('adjustLuminanceToContrast', () => {
  describe('result has target contrast within tolerance', () => {
    test('dark text on white reaches 4.5:1', () => {
      const result = adjustLuminanceToContrast('#555555', '#ffffff', 4.5);
      expect(contrast(result, '#ffffff')).toBeCloseTo(4.5, 0);
    });

    test('light text on black reaches 4.5:1', () => {
      const result = adjustLuminanceToContrast('#999999', '#000000', 4.5);
      expect(contrast(result, '#000000')).toBeCloseTo(4.5, 0);
    });

    test('reaches 3:1 non-content contrast', () => {
      const result = adjustLuminanceToContrast('#888888', '#ffffff', 3);
      expect(contrast(result, '#ffffff')).toBeGreaterThanOrEqual(2.9);
    });

    test('reaches 7:1 enhanced contrast', () => {
      const result = adjustLuminanceToContrast('#666666', '#ffffff', 7);
      expect(contrast(result, '#ffffff')).toBeGreaterThanOrEqual(6.5);
    });
  });

  describe('direction hints', () => {
    test('direction "decrease" moves luminance downward (darkens)', () => {
      const original = '#888888';
      const result = adjustLuminanceToContrast(original, '#ffffff', 4.5, 'decrease');
      // Decreasing luminance toward white → color gets darker
      const origL = chroma(original).luminance();
      const resL = chroma(result).luminance();
      expect(resL).toBeLessThanOrEqual(origL + 0.01);
    });

    test('direction "increase" moves luminance upward (lightens)', () => {
      const original = '#333333';
      const result = adjustLuminanceToContrast(original, '#000000', 4.5, 'increase');
      const origL = chroma(original).luminance();
      const resL = chroma(result).luminance();
      expect(resL).toBeGreaterThanOrEqual(origL - 0.01);
    });
  });

  describe('no adjustment needed', () => {
    test('returns a hex string when already meeting contrast', () => {
      // Black on white already has 21:1; asking for 4.5 should return quickly
      const result = adjustLuminanceToContrast('#000000', '#ffffff', 4.5);
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('return format', () => {
    test('always returns uppercase hex', () => {
      const result = adjustLuminanceToContrast('#336699', '#ffffff', 4.5);
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe('clamps luminance at boundaries', () => {
    test('does not produce NaN or undefined when clamped to min luminance', () => {
      const result = adjustLuminanceToContrast('#000000', '#000000', 21);
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test('does not produce NaN or undefined when clamped to max luminance', () => {
      const result = adjustLuminanceToContrast('#ffffff', '#ffffff', 21);
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
