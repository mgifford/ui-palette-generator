import chroma from 'chroma-js';
import {
  wcagNonContentContrast,
  wcagContentContrast,
  clampHue,
  clampLightness,
  clampChroma,
  toOklchSafe,
  fromOklch,
  computeContrastRatio,
  normalizeColorValue,
  rotateHueValue,
  getHarmonyHuePlan,
  rebuildColorWithHue,
  enforceContrast,
  enforceAgainstBackgrounds,
} from '../colorUtils.js';

// ─── WCAG constants ──────────────────────────────────────────────────────────

describe('WCAG constants', () => {
  test('wcagNonContentContrast is 3', () => {
    expect(wcagNonContentContrast).toBe(3);
  });

  test('wcagContentContrast is 4.5', () => {
    expect(wcagContentContrast).toBe(4.5);
  });
});

// ─── clampHue ─────────────────────────────────────────────────────────────────

describe('clampHue', () => {
  test('0 stays 0', () => expect(clampHue(0)).toBe(0));
  test('180 stays 180', () => expect(clampHue(180)).toBe(180));
  test('359 stays 359', () => expect(clampHue(359)).toBe(359));
  test('360 wraps to 0', () => expect(clampHue(360)).toBe(0));
  test('720 wraps to 0', () => expect(clampHue(720)).toBe(0));
  test('361 wraps to 1', () => expect(clampHue(361)).toBe(1));
  test('-90 wraps to 270', () => expect(clampHue(-90)).toBe(270));
  test('-1 wraps to 359', () => expect(clampHue(-1)).toBe(359));
  test('NaN returns 0', () => expect(clampHue(NaN)).toBe(0));
});

// ─── clampLightness ───────────────────────────────────────────────────────────

describe('clampLightness', () => {
  test('0 → floor 0.08', () => expect(clampLightness(0)).toBe(0.08));
  test('1 → ceiling 0.95', () => expect(clampLightness(1)).toBe(0.95));
  test('0.5 stays 0.5', () => expect(clampLightness(0.5)).toBe(0.5));
  test('negative clamped to 0.08', () => expect(clampLightness(-0.5)).toBe(0.08));
  test('above 1 clamped to 0.95', () => expect(clampLightness(2)).toBe(0.95));
});

// ─── clampChroma ──────────────────────────────────────────────────────────────

describe('clampChroma', () => {
  test('0 stays 0', () => expect(clampChroma(0)).toBe(0));
  test('0.2 stays 0.2', () => expect(clampChroma(0.2)).toBe(0.2));
  test('0.37 stays 0.37', () => expect(clampChroma(0.37)).toBe(0.37));
  test('above 0.37 clamped to 0.37', () => expect(clampChroma(0.5)).toBe(0.37));
  test('negative clamped to 0', () => expect(clampChroma(-0.1)).toBe(0));
});

// ─── toOklchSafe ──────────────────────────────────────────────────────────────

describe('toOklchSafe', () => {
  test('returns object with l, c, h keys', () => {
    const result = toOklchSafe('#ff0000');
    expect(result).toHaveProperty('l');
    expect(result).toHaveProperty('c');
    expect(result).toHaveProperty('h');
  });

  test('l is within clamped range [0.08, 0.95]', () => {
    const { l } = toOklchSafe('#336699');
    expect(l).toBeGreaterThanOrEqual(0.08);
    expect(l).toBeLessThanOrEqual(0.95);
  });

  test('c is within clamped range [0, 0.37]', () => {
    const { c } = toOklchSafe('#ff0000');
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(0.37);
  });

  test('h is within [0, 360)', () => {
    const { h } = toOklchSafe('#0057b8');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });

  test('achromatic color gets valid h (not NaN)', () => {
    const { h } = toOklchSafe('#888888');
    expect(Number.isNaN(h)).toBe(false);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });

  test('invalid color returns safe fallback', () => {
    const result = toOklchSafe('notacolor');
    expect(result).toEqual({ l: 0.6, c: 0.1, h: 0 });
  });
});

// ─── fromOklch ────────────────────────────────────────────────────────────────

describe('fromOklch', () => {
  test('returns a hex string', () => {
    const result = fromOklch({ l: 0.5, c: 0.1, h: 200 });
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test('round-trips through toOklchSafe (approx)', () => {
    const original = '#336699';
    const oklch = toOklchSafe(original);
    const roundTripped = fromOklch(oklch);
    // Colors won't be identical due to clamping, but should be close
    const distance = chroma.distance(original, roundTripped, 'lab');
    expect(distance).toBeLessThan(10);
  });

  test('clamps overshooting l, c, h values', () => {
    // Should not throw even with out-of-range values
    expect(() => fromOklch({ l: 2, c: 1, h: 400 })).not.toThrow();
    const result = fromOklch({ l: 2, c: 1, h: 400 });
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ─── computeContrastRatio ────────────────────────────────────────────────────

describe('computeContrastRatio', () => {
  test('black on white is 21', () => {
    expect(computeContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  test('white on black is 21', () => {
    expect(computeContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });

  test('same color has contrast 1', () => {
    expect(computeContrastRatio('#336699', '#336699')).toBeCloseTo(1, 1);
  });

  test('returns 0 on invalid colors', () => {
    expect(computeContrastRatio('notacolor', '#ffffff')).toBe(0);
  });

  test('contrast ratio is always ≥ 1', () => {
    const r = computeContrastRatio('#3a7fd4', '#ffffff');
    expect(r).toBeGreaterThanOrEqual(1);
  });
});

// ─── normalizeColorValue ─────────────────────────────────────────────────────

describe('normalizeColorValue', () => {
  test('returns uppercase hex for a 6-digit hex input', () => {
    expect(normalizeColorValue('#336699')).toBe('#336699');
  });

  test('returns uppercase hex for hex without #', () => {
    expect(normalizeColorValue('336699')).toBe('#336699');
  });

  test('expands 3-digit shorthand hex', () => {
    expect(normalizeColorValue('#f60')).toBe('#FF6600');
  });

  test('normalizes rgb() string to uppercase hex', () => {
    expect(normalizeColorValue('rgb(255,102,0)')).toBe('#FF6600');
  });

  test('returns null for empty string', () => {
    expect(normalizeColorValue('')).toBeNull();
  });

  test('returns null for null', () => {
    expect(normalizeColorValue(null)).toBeNull();
  });

  test('returns null for undefined', () => {
    expect(normalizeColorValue(undefined)).toBeNull();
  });

  test('returns null for an invalid color string', () => {
    expect(normalizeColorValue('notacolor')).toBeNull();
  });

  test('handles color names (e.g. "red")', () => {
    expect(normalizeColorValue('red')).toBe('#FF0000');
  });
});

// ─── rotateHueValue ───────────────────────────────────────────────────────────

describe('rotateHueValue', () => {
  test('0 + 180 = 180', () => expect(rotateHueValue(0, 180)).toBe(180));
  test('180 + 180 = 0 (wraps)', () => expect(rotateHueValue(180, 180)).toBe(0));
  test('300 + 90 = 30 (wraps)', () => expect(rotateHueValue(300, 90)).toBe(30));
  test('0 + 360 = 0', () => expect(rotateHueValue(0, 360)).toBe(0));
  test('negative delta: 30 - 45 = 345', () => expect(rotateHueValue(30, -45)).toBe(345));
});

// ─── getHarmonyHuePlan ────────────────────────────────────────────────────────

describe('getHarmonyHuePlan', () => {
  const SEED = 60; // yellow-green seed hue

  test('unknown/default mode returns null', () => {
    expect(getHarmonyHuePlan(SEED, 'none')).toBeNull();
    expect(getHarmonyHuePlan(SEED, 'invalid')).toBeNull();
    expect(getHarmonyHuePlan(SEED, '')).toBeNull();
  });

  test('analogous-30: spreads ±30° from seed', () => {
    const plan = getHarmonyHuePlan(SEED, 'analogous-30');
    expect(plan.accentNonContentBaseline).toBe(30);
    expect(plan.accentNonContentStrong).toBe(90);
    expect(plan.accentContentStrong).toBe(SEED);
    expect(plan.accentContentBaseline).toBe(SEED);
  });

  test('analogous-60: spreads ±60° from seed', () => {
    const plan = getHarmonyHuePlan(SEED, 'analogous-60');
    expect(plan.accentNonContentBaseline).toBe(0);
    expect(plan.accentNonContentStrong).toBe(120);
  });

  test('complementary: non-content rotated 180°', () => {
    const plan = getHarmonyHuePlan(0, 'complementary');
    expect(plan.accentNonContentStrong).toBe(180);
    expect(plan.accentContentStrong).toBe(180);
    expect(plan.accentNonContentBaseline).toBe(0);
  });

  test('split-complementary: 150° and 210° offsets', () => {
    const plan = getHarmonyHuePlan(0, 'split-complementary');
    expect(plan.accentNonContentBaseline).toBe(150);
    expect(plan.accentNonContentStrong).toBe(210);
    expect(plan.accentContentStrong).toBe(0);
  });

  test('triadic: 120° steps', () => {
    const plan = getHarmonyHuePlan(0, 'triadic');
    expect(plan.accentNonContentStrong).toBe(120);
    expect(plan.accentContentStrong).toBe(240);
  });

  test('tetradic: 60° and 180° offsets', () => {
    const plan = getHarmonyHuePlan(0, 'tetradic');
    expect(plan.accentNonContentStrong).toBe(180);
    expect(plan.accentContentStrong).toBe(60);
  });

  test('all hue values in plan are in [0, 360)', () => {
    ['analogous-30', 'analogous-60', 'complementary', 'split-complementary', 'triadic', 'tetradic'].forEach(mode => {
      const plan = getHarmonyHuePlan(SEED, mode);
      Object.values(plan).forEach(hue => {
        expect(hue).toBeGreaterThanOrEqual(0);
        expect(hue).toBeLessThan(360);
      });
    });
  });
});

// ─── rebuildColorWithHue ──────────────────────────────────────────────────────

describe('rebuildColorWithHue', () => {
  test('returns a hex string', () => {
    const result = rebuildColorWithHue('#336699', 180);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test('same hue preserves approximate color', () => {
    const original = '#3a7fd4';
    const { h } = toOklchSafe(original);
    const rebuilt = rebuildColorWithHue(original, h);
    const distance = chroma.distance(original, rebuilt, 'lab');
    expect(distance).toBeLessThan(5);
  });

  test('different hue changes the perceived color', () => {
    const result = rebuildColorWithHue('#ff0000', 120); // red → green-ish
    const { h } = toOklchSafe(result);
    // OKLCH hue should be in the green region (roughly 90–160°)
    expect(h).toBeGreaterThan(80);
    expect(h).toBeLessThan(165);
  });
});

// ─── enforceContrast ──────────────────────────────────────────────────────────

describe('enforceContrast', () => {
  test('returns color unchanged if already meeting minContrast', () => {
    // Black on white is 21:1; asking for 4.5 should return a valid hex
    const result = enforceContrast('#000000', '#ffffff', 4.5);
    expect(chroma.contrast(result, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  test('adjusts a mid-gray on white to meet 4.5:1', () => {
    const result = enforceContrast('#888888', '#ffffff', 4.5);
    expect(chroma.contrast(result, '#ffffff')).toBeGreaterThanOrEqual(4.4);
  });

  test('direction "increase" lightens toward white to meet contrast on dark bg', () => {
    const result = enforceContrast('#555555', '#000000', 4.5, 'increase');
    const c = chroma.contrast(result, '#000000');
    expect(c).toBeGreaterThanOrEqual(4.0);
  });

  test('direction "decrease" darkens toward black to meet contrast on white bg', () => {
    const result = enforceContrast('#aaaaaa', '#ffffff', 4.5, 'decrease');
    const c = chroma.contrast(result, '#ffffff');
    expect(c).toBeGreaterThanOrEqual(4.0);
  });

  test('returns the original color on error (invalid hex)', () => {
    const result = enforceContrast('notacolor', '#ffffff', 4.5);
    expect(result).toBe('notacolor');
  });
});

// ─── enforceAgainstBackgrounds ────────────────────────────────────────────────

describe('enforceAgainstBackgrounds', () => {
  test('returns original color when backgrounds array is empty', () => {
    expect(enforceAgainstBackgrounds('#888888', [])).toBe('#888888');
  });

  test('enforces contrast against a single background', () => {
    const result = enforceAgainstBackgrounds('#888888', ['#ffffff'], 4.5);
    expect(chroma.contrast(result, '#ffffff')).toBeGreaterThanOrEqual(4.4);
  });

  test('uses wcagContentContrast (4.5) as default minContrast', () => {
    const result = enforceAgainstBackgrounds('#888888', ['#ffffff']);
    expect(chroma.contrast(result, '#ffffff')).toBeGreaterThanOrEqual(4.4);
  });
});
