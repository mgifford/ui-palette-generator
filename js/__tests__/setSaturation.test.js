import chroma from 'chroma-js';
import { setSaturation } from '../setSaturation.js';

describe('setSaturation', () => {
  describe('return format', () => {
    test('returns uppercase hex string', () => {
      const result = setSaturation('#ff6600', 1);
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe('saturation scaling', () => {
    test('saturation of 1 (100%) leaves the color unchanged', () => {
      const input = '#ff6600';
      const result = setSaturation(input, 1);
      // Hue and lightness should be identical; saturation unchanged
      const [hIn, sIn, lIn] = chroma(input).hsl();
      const [hOut, sOut, lOut] = chroma(result).hsl();
      expect(hOut).toBeCloseTo(hIn, 1);
      expect(lOut).toBeCloseTo(lIn, 2);
      expect(sOut).toBeCloseTo(sIn * 1, 2);
    });

    test('saturation of 0 (0%) produces a grayscale color', () => {
      const result = setSaturation('#ff6600', 0);
      const [, s] = chroma(result).hsl();
      expect(s).toBeLessThan(0.01);
    });

    test('saturation of 0.5 (50%) halves the original saturation', () => {
      const input = '#ff6600';
      const [, sIn] = chroma(input).hsl();
      const result = setSaturation(input, 0.5);
      const [, sOut] = chroma(result).hsl();
      expect(sOut).toBeCloseTo(sIn * 0.5, 1);
    });

    test('saturation of 0.66 reduces saturation by 34%', () => {
      const input = '#3366cc';
      const [, sIn] = chroma(input).hsl();
      const result = setSaturation(input, 0.66);
      const [, sOut] = chroma(result).hsl();
      expect(sOut).toBeCloseTo(sIn * 0.66, 1);
    });
  });

  describe('hue and lightness preservation', () => {
    test('hue is preserved when adjusting saturation', () => {
      const input = '#3366cc';
      const [hIn] = chroma(input).hsl();
      const result = setSaturation(input, 0.5);
      const [hOut] = chroma(result).hsl();
      // Allow ~1° tolerance for floating-point rounding in HSL conversions
      expect(Math.abs(hOut - hIn)).toBeLessThan(1.5);
    });

    test('lightness is preserved when adjusting saturation', () => {
      const input = '#3366cc';
      const [, , lIn] = chroma(input).hsl();
      const result = setSaturation(input, 0.5);
      const [, , lOut] = chroma(result).hsl();
      expect(lOut).toBeCloseTo(lIn, 2);
    });
  });

  describe('various input formats', () => {
    test('handles rgb() color input', () => {
      const result = setSaturation('rgb(255,102,0)', 0.5);
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });

    test('handles shorthand hex', () => {
      const result = setSaturation('#f60', 0.5);
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });
  });
});
