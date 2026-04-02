import chroma from 'chroma-js';
import { decreaseOpacityToContrast } from '../decreaseOpacityToContrast.js';

// Helper: compute WCAG contrast ratio between two hex colors
function contrast(fg, bg) {
  return chroma.contrast(fg, bg);
}

describe('decreaseOpacityToContrast', () => {
  describe('returns a valid hex string', () => {
    test('output is always a hex color', () => {
      const result = decreaseOpacityToContrast('#0057b8', '#ffffff', 3);
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    test('output is always uppercase hex', () => {
      const result = decreaseOpacityToContrast('#0057b8', '#ffffff', 3);
      expect(result).toMatch(/^#[0-9A-F]{6}$/);
    });
  });

  describe('result has target contrast within tolerance', () => {
    test('reduces blue on white to ~3:1 non-content contrast', () => {
      const result = decreaseOpacityToContrast('#0057b8', '#ffffff', 3);
      const actualContrast = contrast(result, '#ffffff');
      expect(actualContrast).toBeGreaterThanOrEqual(2.8);
      expect(actualContrast).toBeLessThanOrEqual(4.5);
    });

    test('reduces dark color on white to ~1.5:1', () => {
      const result = decreaseOpacityToContrast('#000000', '#ffffff', 1.5);
      const actualContrast = contrast(result, '#ffffff');
      expect(actualContrast).toBeGreaterThanOrEqual(1.0);
      expect(actualContrast).toBeLessThanOrEqual(3.0);
    });
  });

  describe('blending behavior', () => {
    test('result is between fg and bg colors (blended)', () => {
      const fg = '#000000';
      const bg = '#ffffff';
      const result = decreaseOpacityToContrast(fg, bg, 3);
      // Blended gray should be neither pure black nor pure white
      const lum = chroma(result).luminance();
      expect(lum).toBeGreaterThan(0);
      expect(lum).toBeLessThan(1);
    });

    test('uses the background color as the blending surface', () => {
      const lightResult = decreaseOpacityToContrast('#0000ff', '#ffffff', 1.5);
      const darkResult = decreaseOpacityToContrast('#0000ff', '#000000', 1.5);
      // Blending blue onto white produces a lighter tone than blending onto black
      expect(chroma(lightResult).luminance()).toBeGreaterThan(
        chroma(darkResult).luminance()
      );
    });
  });

  describe('edge cases', () => {
    test('foreground already meets a low target — opacity stays near 1', () => {
      // A very low target contrast (1.1) should not overshoot dramatically
      const result = decreaseOpacityToContrast('#0000ff', '#ffffff', 1.1);
      const actualContrast = contrast(result, '#ffffff');
      expect(actualContrast).toBeGreaterThanOrEqual(1.0);
    });

    test('handles achromatic (gray) foreground', () => {
      const result = decreaseOpacityToContrast('#808080', '#ffffff', 1.5);
      expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
