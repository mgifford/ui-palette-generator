/**
 * Palette Generation Algorithms
 * Rongin (golden ratio analogous) and ChromaVerse (analogous harmony)
 * 
 * Each algorithm takes a hex base color and returns:
 * { lightAccent: [hex, hex, ...], darkAccent: [hex, hex, ...] }
 */

// ============================================================
// Color Math Utilities
// ============================================================

/**
 * Convert hex color to HSL
 * @param {string} hex - Color in hex format (#RRGGBB)
 * @returns {object} {h: 0-360, s: 0-100, l: 0-100}
 */
function hexToHsl(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / delta + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / delta + 2) / 6; break;
      case b: h = ((r - g) / delta + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to hex
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color (#RRGGBB)
 */
function hslToHex(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Rotate a color's hue
 * @param {string} hex - Color in hex format
 * @param {number} angleOffset - Angle to rotate in degrees
 * @returns {string} New hex color
 */
function rotateHue(hex, angleOffset) {
  const hsl = hexToHsl(hex);
  hsl.h = (hsl.h + angleOffset) % 360;
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

/**
 * Adjust lightness of a color
 * @param {string} hex - Color in hex format
 * @param {number} newLightness - New lightness value (0-100)
 * @returns {string} New hex color
 */
function setLightness(hex, newLightness) {
  const hsl = hexToHsl(hex);
  return hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(100, newLightness)));
}

// ============================================================
// Rongin Algorithm (Golden Ratio Analogous)
// ============================================================

/**
 * Rongin: Generate palette using golden ratio analogous harmony
 * Uses 137.5° (golden ratio) for hue rotation
 * @param {string} baseHex - Seed color in hex format
 * @returns {object} {lightAccent: [hex, hex, ...], darkAccent: [hex, hex, ...]}
 */
function generateRonginPalette(baseHex) {
  const hsl = hexToHsl(baseHex);
  
  // Boost saturation if too muted
  if (hsl.s < 10) {
    hsl.s = Math.floor(Math.random() * 20 + 10); // 10-30%
  }
  
  const baseHex_normalized = hslToHex(hsl.h, hsl.s, hsl.l);
  const harmonyAngle = 137.508; // Golden ratio
  
  // Generate 5 colors using golden ratio rotation
  const colors = [];
  for (let i = 0; i < 5; i++) {
    const rotated = rotateHue(baseHex_normalized, harmonyAngle * i);
    colors.push(rotated);
  }
  
  // Map to light and dark variants
  // We'll use index 0, 2, 4 for a balanced selection
  // Baseline = lighter variant, Strong = darker variant
  const lightAccent = [
    setLightness(colors[0], 70),  // baseline (lighter)
    setLightness(colors[0], 50),  // strong (darker)
    setLightness(colors[2], 70),  // secondary baseline
    setLightness(colors[2], 50),  // secondary strong
  ];
  
  // For dark mode, flip lightness (light becomes dark, dark becomes light)
  const darkAccent = [
    setLightness(colors[1], 40),  // baseline (darker in dark mode)
    setLightness(colors[1], 20),  // strong (lighter in dark mode)
    setLightness(colors[3], 40),  // secondary baseline
    setLightness(colors[3], 20),  // secondary strong
  ];
  
  return { lightAccent, darkAccent };
}

// ============================================================
// ChromaVerse Algorithm (Analogous Harmony)
// ============================================================

/**
 * ChromaVerse: Generate palette using analogous harmony
 * Uses 30° increments for closely related colors
 * @param {string} baseHex - Seed color in hex format
 * @returns {object} {lightAccent: [hex, hex, ...], darkAccent: [hex, hex, ...]}
 */
function generateChromaVersePalette(baseHex) {
  const hsl = hexToHsl(baseHex);
  
  // Boost saturation if too muted
  if (hsl.s < 10) {
    hsl.s = Math.floor(Math.random() * 20 + 10);
  }
  
  const baseHex_normalized = hslToHex(hsl.h, hsl.s, hsl.l);
  
  // Generate analogous colors at 30° intervals
  const colors = [];
  for (let i = 0; i < 5; i++) {
    const rotated = rotateHue(baseHex_normalized, 30 * i);
    colors.push(rotated);
  }
  
  // Map to light and dark variants
  // Baseline = lighter, Strong = darker
  const lightAccent = [
    setLightness(colors[0], 65),  // baseline (lighter)
    setLightness(colors[0], 45),  // strong (darker)
    setLightness(colors[2], 65),  // secondary baseline
    setLightness(colors[2], 45),  // secondary strong
  ];
  
  // For dark mode, invert
  const darkAccent = [
    setLightness(colors[1], 45),  // baseline (darker in dark mode)
    setLightness(colors[1], 25),  // strong (lighter in dark mode)
    setLightness(colors[3], 45),  // secondary baseline
    setLightness(colors[3], 25),  // secondary strong
  ];
  
  return { lightAccent, darkAccent };
}

// ============================================================
// Export for use in main.js
// ============================================================

window.PaletteAlgos = {
  rongin: generateRonginPalette,
  chromaVerse: generateChromaVersePalette,
  hexToHsl,
  hslToHex,
  rotateHue,
  setLightness
};
