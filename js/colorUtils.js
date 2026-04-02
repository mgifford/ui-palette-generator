import chroma from 'chroma-js';

export const wcagNonContentContrast = 3;
export const wcagContentContrast = 4.5;

export function clampHue(h) {
  if (Number.isNaN(h)) return 0;
  let hue = h % 360;
  if (hue < 0) hue += 360;
  return hue;
}

export function clampLightness(l) {
  // Keep tones in a safe UI range
  return Math.min(Math.max(l, 0.08), 0.95);
}

export function clampChroma(c) {
  // OKLCH chroma above ~0.37 often clips on sRGB
  return Math.min(Math.max(c, 0), 0.37);
}

export function toOklchSafe(hex) {
  try {
    const [l, c, h] = chroma(hex).oklch();
    // Fallback hue if chroma is 0 (achromatic)
    const hue = Number.isNaN(h) ? clampHue(chroma(hex).get('hsl.h') || 0) : clampHue(h);
    return { l: clampLightness(l), c: clampChroma(c), h: hue };
  } catch (e) {
    return { l: 0.6, c: 0.1, h: 0 };
  }
}

export function fromOklch(parts) {
  const l = clampLightness(parts.l);
  const c = clampChroma(parts.c);
  const h = clampHue(parts.h);
  return chroma.oklch(l, c, h).hex();
}

// Basic WCAG contrast helper (returns numeric ratio or 0 on error)
export function computeContrastRatio(fg, bg) {
  try {
    return chroma.contrast(fg, bg);
  } catch (e) {
    return 0;
  }
}

// Normalize user-provided colors to uppercase hex; return null if invalid
export function normalizeColorValue(value) {
  const raw = (value || '').toString().trim();
  if (!raw) return null;

  const hexMatch = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const candidate = hexMatch ? `#${hexMatch[1]}` : raw;

  try {
    return chroma(candidate).hex().toUpperCase();
  } catch (e) {
    return null;
  }
}

export function rotateHueValue(h, delta) {
  return clampHue(h + delta);
}

export function getHarmonyHuePlan(seedHue, mode) {
  const h = clampHue(seedHue);
  switch (mode) {
    case 'analogous-30':
      return {
        accentNonContentBaseline: rotateHueValue(h, -30),
        accentNonContentStrong: rotateHueValue(h, 30),
        accentContentStrong: h,
        accentContentBaseline: h
      };
    case 'analogous-60':
      return {
        accentNonContentBaseline: rotateHueValue(h, -60),
        accentNonContentStrong: rotateHueValue(h, 60),
        accentContentStrong: h,
        accentContentBaseline: h
      };
    case 'complementary':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 180),
        accentContentStrong: rotateHueValue(h, 180),
        accentContentBaseline: rotateHueValue(h, 180)
      };
    case 'split-complementary':
      return {
        accentNonContentBaseline: rotateHueValue(h, 150),
        accentNonContentStrong: rotateHueValue(h, 210),
        accentContentStrong: h,
        accentContentBaseline: h
      };
    case 'triadic':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 120),
        accentContentStrong: rotateHueValue(h, 240),
        accentContentBaseline: rotateHueValue(h, 240)
      };
    case 'tetradic':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 180),
        accentContentStrong: rotateHueValue(h, 60),
        accentContentBaseline: rotateHueValue(h, 60)
      };
    default:
      return null;
  }
}

export function rebuildColorWithHue(baseHex, targetHue) {
  const base = toOklchSafe(baseHex);
  return fromOklch({ ...base, h: clampHue(targetHue) });
}

export function enforceContrast(hexColor, bgHex, minContrast, directionHint) {
  // Deterministically adjust lightness first, then chroma if needed
  try {
    let color = chroma(hexColor);
    const bg = chroma(bgHex);
    let contrast = chroma.contrast(color, bg);
    if (contrast >= minContrast) return color.hex();

    const step = 0.02; // 2% L steps
    const maxSteps = 14; // up to ~28% total shift
    const base = toOklchSafe(color.hex());

    function tryDirection(sign) {
      for (let i = 1; i <= maxSteps; i += 1) {
        const candidate = { ...base, l: clampLightness(base.l + sign * step * i) };
        const hex = fromOklch(candidate);
        const c = chroma.contrast(hex, bg);
        if (c > contrast) {
          color = chroma(hex);
          contrast = c;
          if (contrast >= minContrast) return hex;
        }
      }
      return color.hex();
    }

    if (directionHint === 'increase') {
      tryDirection(1);
    } else if (directionHint === 'decrease') {
      tryDirection(-1);
    } else {
      // Choose the direction that improves contrast most at the first step
      const lighter = fromOklch({ ...base, l: clampLightness(base.l + step) });
      const darker = fromOklch({ ...base, l: clampLightness(base.l - step) });
      const lighterDelta = chroma.contrast(lighter, bg) - contrast;
      const darkerDelta = chroma.contrast(darker, bg) - contrast;
      if (lighterDelta >= darkerDelta) {
        tryDirection(1);
        if (contrast < minContrast) tryDirection(-1);
      } else {
        tryDirection(-1);
        if (contrast < minContrast) tryDirection(1);
      }
    }

    // If still short, reduce chroma in small steps
    if (contrast < minContrast) {
      for (let pct = 0.9; pct >= 0.5; pct -= 0.1) {
        const reduced = { ...toOklchSafe(color.hex()), c: clampChroma(base.c * pct) };
        const hex = fromOklch(reduced);
        const c = chroma.contrast(hex, bg);
        if (c > contrast) {
          color = chroma(hex);
          contrast = c;
          if (contrast >= minContrast) break;
        }
      }
    }

    return color.hex();
  } catch (e) {
    return hexColor;
  }
}

// Ensure a color meets contrast against multiple backgrounds; returns adjusted hex
export function enforceAgainstBackgrounds(hexColor, backgrounds = [], minContrast = wcagContentContrast, directionHint) {
  if (!backgrounds.length) return hexColor;
  let adjusted = hexColor;
  backgrounds.forEach(function(bg) {
    adjusted = enforceContrast(adjusted, bg, minContrast, directionHint);
  });
  return adjusted;
}
