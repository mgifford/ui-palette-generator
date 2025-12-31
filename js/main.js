import chroma from 'chroma-js';

import $ from 'jquery';
// Suppress noisy extension-origin errors (e.g. background-redux-new.js)
// These errors come from browser extensions running in the page context
// and are not caused by this site. Prefer disabling the offending
// extension in the browser, but as a convenience we filter known
// messages so they don't clutter the console during local dev.
window.addEventListener('error', function (ev) {
  try {
    const msg = ev && ev.message ? ev.message.toString() : '';
    const file = ev && ev.filename ? ev.filename.toString() : '';
    if (msg.includes('No tab with id') || file.includes('background-redux-new.js') || file.startsWith('chrome-extension://')) {
      ev.preventDefault();
      return true;
    }
  } catch (e) {}
}, true);

window.addEventListener('unhandledrejection', function (ev) {
  try {
    const reason = ev && ev.reason ? (ev.reason.message || ev.reason).toString() : '';
    if (reason.includes('No tab with id')) {
      ev.preventDefault();
      return true;
    }
  } catch (e) {}
});
import { adjustLuminanceToContrast } from '../js/adjustLuminanceToContrast.js'
import { decreaseOpacityToContrast } from '../js/decreaseOpacityToContrast.js'
import { setSaturation } from '../js/setSaturation.js'
import { copyCssVariables } from '../js/copyGeneratedColors.js';
import { initColorPicker } from './colorpicker.js';
import * as uswds from './uswds.js';
// Add in-page a11y runner using axe-core from CDN
function addA11yPanelHandlers() {
  document.addEventListener('click', function(e){
    if (e.target && e.target.id === 'runA11y') {
      runA11yCheck();
    }
  });
}

async function runA11yCheck() {
  const resultsEl = document.getElementById('a11yResults');
  if (!resultsEl) return;
  resultsEl.textContent = 'Running...';
  try {
    if (!window.axe) {
      await new Promise(function(resolve, reject){
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.2/axe.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const opts = { runOnly: { type: 'tag', values: ['wcag2aa', 'wcag21aa'] } };
    const results = await window.axe.run(document, opts);
    const issues = results.violations || [];
    if (!issues.length) {
      resultsEl.innerHTML = '<div style="color:green">No violations found (WCAG 2.1 AA subset).</div>';
      return;
    }
    const rows = issues.map(v=> {
      return `<div style="border-bottom:1px solid #eee;padding:.5rem"><strong>${v.id}</strong> — ${v.impact || ''}<div style="font-size:.9rem;color:#444;margin-top:.25rem">${v.description}</div><details style="margin-top:.25rem"><summary>Nodes (${v.nodes.length})</summary>${v.nodes.map(n=>`<div style="padding:.25rem;border-top:1px dashed #f0f0f0;margin-top:.25rem"><div style="font-size:.8rem;color:#666">Selector: ${n.target.join(', ')}</div><pre style="white-space:pre-wrap">${escapeHtml(n.failureSummary || n.html || '')}</pre></div>`).join('')}</details></div>`;
    }).join('');
    resultsEl.innerHTML = rows;
  } catch (e) {
    resultsEl.textContent = 'Error running axe: ' + (e && e.message ? e.message : String(e));
  }
}

function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

addA11yPanelHandlers();

const wcagNonContentContrast = 3;
const wcagContentContrast = 4.5;
const root = document.documentElement;
const whiteColor = "#FFF";
const blackColor = "#000";

// Deterministic harmony configuration (accent-only overlays)
const HARMONY_DEFAULT = 'none';
const HARMONY_MODES = [
  { id: 'none', label: 'Default model' },
  { id: 'analogous-30', label: 'Analogous (±30°)' },
  { id: 'analogous-60', label: 'Analogous (±60°)' },
  { id: 'complementary', label: 'Complementary (180°)' },
  { id: 'split-complementary', label: 'Split-complementary (180° ± 30°)' },
  { id: 'triadic', label: 'Triadic (120° steps)' },
  { id: 'tetradic', label: 'Tetradic (rectangle)' }
];

// Shared harmony state for URL + UI sync
window.HARMONY_STATE = { mode: HARMONY_DEFAULT };

const TOKEN_CATALOG = [
  { id: 'seed', label: 'Accent seed', category: 'dominant', usage: 'seed-accent' },
  { id: 'canvas', label: 'Canvas background', category: 'background', usage: 'canvas-surface' },
  { id: 'card', label: 'Card background', category: 'background', usage: 'card-surface' },
  { id: 'accentNonContentBaseline', label: 'Accent baseline (non-content)', category: 'accent', usage: 'non-content-baseline' },
  { id: 'accentNonContentSoft', label: 'Accent soft (non-content)', category: 'accent', usage: 'non-content-soft' },
  { id: 'accentNonContentSubdued', label: 'Accent subdued (non-content)', category: 'accent', usage: 'non-content-subdued' },
  { id: 'accentNonContentStrong', label: 'Accent strong (non-content)', category: 'accent', usage: 'non-content-strong' },
  { id: 'accentContentBaseline', label: 'Accent baseline (content)', category: 'accent', usage: 'content-baseline' },
  { id: 'accentContentSubdued', label: 'Accent subdued (content)', category: 'accent', usage: 'content-subdued' },
  { id: 'accentContentStrong', label: 'Accent strong (content)', category: 'accent', usage: 'content-strong' },
  { id: 'neutralNonContentSoft', label: 'Neutral soft (non-content)', category: 'neutral', usage: 'non-content-soft' },
  { id: 'neutralNonContentSubdued', label: 'Neutral subdued (non-content)', category: 'neutral', usage: 'non-content-subdued' },
  { id: 'neutralNonContentStrong', label: 'Neutral strong (non-content)', category: 'neutral', usage: 'non-content-strong' },
  { id: 'neutralContentSubdued', label: 'Neutral subdued (content)', category: 'neutral', usage: 'content-subdued' },
  { id: 'neutralContentStrong', label: 'Neutral strong (content)', category: 'neutral', usage: 'content-strong' }
].map(function(token) {
  return { ...token, cssVar: `--color-${token.id}` };
});

// Add semantic/policy tokens that are used by the demo but not part
// of the technical token generation above. These will map to sensible
// generated colors so the demo reflects the palette fully.
['primary','secondary','accent','background','surface','error','warning','info','success'].forEach(function(id){
  TOKEN_CATALOG.push({ id: id, label: id.charAt(0).toUpperCase() + id.slice(1), category: id === 'background' || id === 'surface' ? 'background' : 'dominant', usage: id });
});
// ensure cssVar is present on the newly pushed tokens
TOKEN_CATALOG.forEach(function(token){ token.cssVar = token.cssVar || `--color-${token.id}`; });

const TOKEN_LOOKUP = TOKEN_CATALOG.reduce(function(acc, token) {
  acc[token.id] = token;
  return acc;
}, {});
const CSV_HEADER = ['theme', 'color', 'token', 'role', 'category', 'usage'];

// Contrast report configuration
const CONTRAST_FOREGROUNDS = [
  'accentContentStrong',
  'accentContentSubdued',
  'accentContentBaseline',
  'neutralContentStrong',
  'neutralContentSubdued'
];
const CONTRAST_BACKGROUNDS = [
  'canvas',
  'card',
  'accentNonContentSoft',
  'neutralNonContentSoft'
];
const FOCUS_FOREGROUNDS = ['accentContentStrong', 'accentContentBaseline'];
const APCA_THRESHOLDS = {
  text: 60,      // body text
  largeText: 45, // large / bold text
  nonText: 60,   // UI icons/lines
  focus: 60      // focus indicators/outlines
};
const CONTENT_REFINEMENT_TOKENS = [
  'accentContentStrong',
  'accentContentSubdued',
  'accentContentBaseline',
  'neutralContentStrong',
  'neutralContentSubdued'
];

function getHarmonyMode() {
  const mode = (window.HARMONY_STATE && window.HARMONY_STATE.mode) || HARMONY_DEFAULT;
  const valid = HARMONY_MODES.some(function(m) { return m.id === mode; });
  return valid ? mode : HARMONY_DEFAULT;
}

function setHarmonyMode(mode, opts = {}) {
  const { persist = true, syncUi = true } = opts;
  const next = HARMONY_MODES.some(function(m) { return m.id === mode; }) ? mode : HARMONY_DEFAULT;
  window.HARMONY_STATE = window.HARMONY_STATE || {};
  window.HARMONY_STATE.mode = next;

  if (persist) {
    try { localStorage.setItem('harmonyMode', next); } catch (e) {}
  }
  if (syncUi) {
    const select = document.getElementById('harmonyMode');
    if (select) {
      select.value = next;
    }
  }
  try { setHashFromOverrides(); } catch (e) {}
  return next;
}

function restoreHarmonyModeFromStorage() {
  try {
    if (getHarmonyMode() !== HARMONY_DEFAULT) return;
    const stored = localStorage.getItem('harmonyMode');
    if (stored && HARMONY_MODES.some(function(m) { return m.id === stored; })) {
      setHarmonyMode(stored, { syncUi: true, persist: false });
    }
  } catch (e) {}
}

function pickRandomHarmonyMode() {
  const choices = HARMONY_MODES.filter(function(m) { return m.id !== 'none'; });
  if (!choices.length) return HARMONY_DEFAULT;
  const idx = Math.floor(Math.random() * choices.length);
  return choices[idx].id;
}

function initHarmonyControls() {
  const select = document.getElementById('harmonyMode');
  if (select && !select.options.length) {
    HARMONY_MODES.forEach(function(mode) {
      const opt = document.createElement('option');
      opt.value = mode.id;
      opt.textContent = mode.label;
      select.appendChild(opt);
    });
  }

  if (select) {
    select.value = getHarmonyMode();
    select.addEventListener('change', function(e) {
      setHarmonyMode(e.target.value);
      generatePalette();
    });
  }

  const randomBtn = document.getElementById('randomHarmonyBtn');
  if (randomBtn) {
    randomBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const choice = pickRandomHarmonyMode();
      setHarmonyMode(choice);
      generatePalette();
    });
  }
}

// ============================================
// Harmony utilities (OKLCH-based, deterministic)
// ============================================
function clampHue(h) {
  if (Number.isNaN(h)) return 0;
  let hue = h % 360;
  if (hue < 0) hue += 360;
  return hue;
}

function clampLightness(l) {
  // Keep tones in a safe UI range
  return Math.min(Math.max(l, 0.08), 0.95);
}

function clampChroma(c) {
  // OKLCH chroma above ~0.37 often clips on sRGB
  return Math.min(Math.max(c, 0), 0.37);
}

function toOklchSafe(hex) {
  try {
    const [l, c, h] = chroma(hex).oklch();
    // Fallback hue if chroma is 0 (achromatic)
    const hue = Number.isNaN(h) ? clampHue(chroma(hex).get('hsl.h') || 0) : clampHue(h);
    return { l: clampLightness(l), c: clampChroma(c), h: hue };
  } catch (e) {
    return { l: 0.6, c: 0.1, h: 0 };
  }
}

function fromOklch(parts) {
  const l = clampLightness(parts.l);
  const c = clampChroma(parts.c);
  const h = clampHue(parts.h);
  return chroma.oklch(l, c, h).hex();
}

function rotateHueValue(h, delta) {
  return clampHue(h + delta);
}

function enforceContrast(hexColor, bgHex, minContrast, directionHint) {
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

function getHarmonyHuePlan(seedHue, mode) {
  const h = clampHue(seedHue);
  switch (mode) {
    case 'analogous-30':
      return {
        accentNonContentBaseline: rotateHueValue(h, -30),
        accentNonContentStrong: rotateHueValue(h, 30),
        accentContentStrong: h
      };
    case 'analogous-60':
      return {
        accentNonContentBaseline: rotateHueValue(h, -60),
        accentNonContentStrong: rotateHueValue(h, 60),
        accentContentStrong: h
      };
    case 'complementary':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 180),
        accentContentStrong: rotateHueValue(h, 180)
      };
    case 'split-complementary':
      return {
        accentNonContentBaseline: rotateHueValue(h, 150),
        accentNonContentStrong: rotateHueValue(h, 210),
        accentContentStrong: h
      };
    case 'triadic':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 120),
        accentContentStrong: rotateHueValue(h, 240)
      };
    case 'tetradic':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 180),
        accentContentStrong: rotateHueValue(h, 60)
      };
    default:
      return null;
  }
}

function rebuildColorWithHue(baseHex, targetHue) {
  const base = toOklchSafe(baseHex);
  return fromOklch({ ...base, h: clampHue(targetHue) });
}

function applyHarmonyLayer(mode, options = {}) {
  if (!mode || mode === 'none') return;

  const seedValue = (document.getElementById('accentColor') && document.getElementById('accentColor').value) || '';
  const normalizedSeed = normalizeColorValue(seedValue) || seedValue;
  const seedOklch = toOklchSafe(normalizedSeed || '#888888');
  const huePlan = getHarmonyHuePlan(seedOklch.h, mode);
  if (!huePlan) return;

  const nonContentContrast = options.nonContentContrast || wcagNonContentContrast;
  const softContrast = options.softContrast || 1.1;
  const strongContrastTarget = options.strongContrast || 1.7;
  const contentContrast = options.contentContrast || wcagContentContrast;

  ['light', 'dark'].forEach(function(theme) {
    const card = getSwatchColor(theme, 'card');
    const canvas = getSwatchColor(theme, 'canvas') || card;

    const baseNonContentBaseline = getSwatchColor(theme, 'accentNonContentBaseline');
    const baseNonContentStrong = getSwatchColor(theme, 'accentNonContentStrong');
    const baseContentStrong = getSwatchColor(theme, 'accentContentStrong');

    if (!card || !baseNonContentStrong || !baseContentStrong) return;

    const remappedBaseline = enforceContrast(
      rebuildColorWithHue(baseNonContentBaseline || baseNonContentStrong, huePlan.accentNonContentBaseline),
      card,
      nonContentContrast,
      theme === 'dark' ? 'increase' : 'decrease'
    );

    const remappedNonContentStrong = enforceContrast(
      rebuildColorWithHue(baseNonContentStrong, huePlan.accentNonContentStrong),
      card,
      strongContrastTarget,
      theme === 'dark' ? 'increase' : 'decrease'
    );

    const remappedContentStrong = enforceContrast(
      rebuildColorWithHue(baseContentStrong, huePlan.accentContentStrong),
      canvas,
      contentContrast,
      theme === 'dark' ? 'increase' : 'decrease'
    );

    // Derived tokens stay tied to strong accents
    const remappedNonContentSoft = decreaseOpacityToContrast(remappedNonContentStrong, card, softContrast);
    const remappedNonContentSubdued = decreaseOpacityToContrast(remappedNonContentStrong, card, nonContentContrast);
    const remappedContentSubdued = decreaseOpacityToContrast(remappedContentStrong, card, contentContrast);

    setCssColor(theme, 'accentNonContentBaseline', '--color-accentNonContentBaseline', remappedBaseline);
    setCssColor(theme, 'accentNonContentStrong', '--color-accentNonContentStrong', remappedNonContentStrong);
    setCssColor(theme, 'accentNonContentSoft', '--color-accentNonContentSoft', remappedNonContentSoft);
    setCssColor(theme, 'accentNonContentSubdued', '--color-accentNonContentSubdued', remappedNonContentSubdued);
    setCssColor(theme, 'accentContentStrong', '--color-accentContentStrong', remappedContentStrong);
    setCssColor(theme, 'accentContentSubdued', '--color-accentContentSubdued', remappedContentSubdued);
  });
}

// Insert a random seed value; optionally regenerate immediately
function generateRandomColor(options = {}) {
  const { apply = false } = options;
  const randomColor = chroma.random().hex().toUpperCase();
  $('#accentColor').val(randomColor);
  $('#accentColor').parent().find('.mini-swatch').css('background-color', randomColor);
  try { window.LAST_RAW_ACCENT = randomColor; } catch (e) {}
  if (apply) {
    try { generatePalette(); } catch (e) {}
  }
}

// expose generatePalette globally for small modules to call
window.generatePalette = generatePalette;

initializeScopedIds();
generateRandomColor();
// Parse any color overrides from the URL hash before generating
/**
 * Parse URL hash into color overrides and settings.
 * 
 * Supported formats:
 *   - seed=COLOR         : Set the seed/accent color (e.g. seed=A7C39F or seed=red)
 *   - harm=MODE          : Set harmony mode (e.g. harm=split-complementary)
 *   - lTOKEN=HEX         : Set light theme token (e.g. lcanv=E5F6CA, lcrd=F0FADF)
 *   - dTOKEN=HEX         : Set dark theme token (e.g. dcanv=232422)
 * 
 * Token abbreviations: canv=canvas, crd=card, ans=accentNonContentStrong,
 *                      ansub=accentNonContentSubdued, etc.
 * 
 * Examples:
 *   #seed=A7C39F,harm=split-complementary
 *   #seed=red,harm=analogous,lcanv=E5F6CA,dcard=313230
 *   #seed=FF0000
 * 
 * Backwards compatible with old format: #colors=light.seed=AA00AA,accent=red,harmony=triadic
 */
function parseHashToOverrides() {
  try {
    const raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    
    // Split top-level comma-separated pairs
    const pairs = raw.split(',').map(s=>s.trim()).filter(Boolean);
    const obj = {};
    
    // Map short token names back to full names
    const shortToFullToken = {
      'seed': 'seed',
      'canv': 'canvas',
      'crd': 'card',
      'anb': 'accentNonContentBaseline',
      'ans': 'accentNonContentStrong',
      'ansub': 'accentNonContentSubdued',
      'ansf': 'accentNonContentSoft',
      'acb': 'accentContentBaseline',
      'acs': 'accentContentStrong',
      'acsub': 'accentContentSubdued',
      'acsf': 'accentContentSoft',
      'nnb': 'neutralNonContentBaseline',
      'nns': 'neutralNonContentStrong',
      'nnsub': 'neutralNonContentSubdued',
      'nnsf': 'neutralNonContentSoft',
      'ncb': 'neutralContentBaseline',
      'ncs': 'neutralContentStrong',
      'ncsub': 'neutralContentSubdued',
      'ncsf': 'neutralContentSoft'
    };
    
    pairs.forEach(function(pair){
      const kv = pair.split('=');
      if (kv.length < 2) return;
      const key = decodeURIComponent(kv[0]);
      const rest = kv.slice(1).join('=');
      
      // Handle new short format: seed=..., harm=..., lcanv=..., dcanv=...
      if (key === 'seed') {
        const rawAccent = decodeURIComponent(rest || '').trim();
        if (rawAccent) {
          window.LAST_RAW_ACCENT = rawAccent;
          try {
            const accInput = document.getElementById('accentColor');
            if (accInput) {
              accInput.value = rawAccent;
              accInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch(e){}
          try { updateContrastReport(); } catch (e) { console.info('Contrast report update failed', e); }
        }
        return;
      }
      
      if (key === 'harm' || key === 'harmony') {
        const mode = decodeURIComponent(rest || '').trim();
        if (mode) {
          setHarmonyMode(mode, { syncUi: false, persist: false });
        }
        return;
      }
      
      // Handle old format: colors=light.token=HEX,... (for backwards compatibility)
      if (key === 'colors') {
        // This is the old format combined into one param, parse recursively
        const oldPairs = rest.split(',').map(s=>s.trim()).filter(Boolean);
        oldPairs.forEach(function(oldPair) {
          const oldKv = oldPair.split('=');
          if (oldKv.length >= 2) {
            const oldKey = oldKv[0];
            const oldHex = '#' + oldKv.slice(1).join('=').replace(/^#/, '').toUpperCase();
            const parts = oldKey.split('.');
            if (parts.length === 2) {
              const theme = parts[0];
              const token = parts[1];
              obj[theme] = obj[theme] || {};
              obj[theme][token] = oldHex;
            } else if (parts.length === 1) {
              obj.light = obj.light || {};
              obj.light[parts[0]] = oldHex;
            }
          }
        });
        return;
      }
      
      // Handle new format: lcanv=HEX, dcanv=HEX, etc.
      if (key.length >= 2) {
        const themePrefix = key.charAt(0);
        const tokenShort = key.substring(1);
        const theme = themePrefix === 'l' ? 'light' : (themePrefix === 'd' ? 'dark' : null);
        const token = shortToFullToken[tokenShort] || tokenShort;
        
        if (theme && token) {
          const hex = '#' + rest.replace(/^#/, '').toUpperCase();
          obj[theme] = obj[theme] || {};
          obj[theme][token] = hex;
        }
      }
    });
    
    if (Object.keys(obj).length) {
      try { localStorage.setItem('customColorOverrides', JSON.stringify(obj)); } catch (e) {}
      window.CUSTOM_COLOR_OVERRIDES = obj;
      return obj;
    }
  } catch (e) {}
  return null;
}

/**
 * Generate URL hash from current color overrides and settings.
 * 
 * Creates a compact, shareable URL format:
 *   seed=COLOR          : Seed/accent color
 *   harm=MODE           : Harmony mode
 *   lTOKEN=HEX          : Light theme token overrides (using abbreviations)
 *   dTOKEN=HEX          : Dark theme token overrides (using abbreviations)
 * 
 * Example output: #seed=A7C39F,harm=split-complementary,lcanv=E5F6CA
 */
function setHashFromOverrides() {
  try {
    const parts = [];
    
    // Include seed color (shorthand for accent color)
    try {
      const rawAccent = window.LAST_RAW_ACCENT || (document.getElementById('accentColor') && document.getElementById('accentColor').value) || '';
      if (rawAccent) {
        const accentValue = (window.LAST_RAW_ACCENT || rawAccent).toString().replace(/^#/, '');
        parts.push(`seed=${encodeURIComponent(accentValue)}`);
      }
    } catch(e) {}
    
    // Include harmony mode
    try {
      const harmonyMode = getHarmonyMode();
      if (harmonyMode && harmonyMode !== HARMONY_DEFAULT) {
        parts.push(`harm=${encodeURIComponent(harmonyMode)}`);
      }
    } catch (e) {}
    
    // Include custom color overrides for specific tokens (short param names)
    try {
      const obj = window.CUSTOM_COLOR_OVERRIDES || JSON.parse(localStorage.getItem('customColorOverrides') || '{}');
      const tokenShortNames = {
        // Canvas/background tokens
        'canvas': 'canv',
        'card': 'crd',
        // Accent colors (non-content)
        'accentNonContentBaseline': 'anb',
        'accentNonContentStrong': 'ans',
        'accentNonContentSubdued': 'ansub',
        'accentNonContentSoft': 'ansf',
        // Accent colors (content)
        'accentContentBaseline': 'acb',
        'accentContentStrong': 'acs',
        'accentContentSubdued': 'acsub',
        'accentContentSoft': 'acsf',
        // Neutral colors (non-content)
        'neutralNonContentBaseline': 'nnb',
        'neutralNonContentStrong': 'nns',
        'neutralNonContentSubdued': 'nnsub',
        'neutralNonContentSoft': 'nnsf',
        // Neutral colors (content)
        'neutralContentBaseline': 'ncb',
        'neutralContentStrong': 'ncs',
        'neutralContentSubdued': 'ncsub',
        'neutralContentSoft': 'ncsf'
      };
      
      Object.keys(obj).forEach(function(theme){
        const tokens = obj[theme] || {};
        Object.keys(tokens).forEach(function(token){
          if (token === 'seed') return; // seed is handled above
          const hex = (tokens[token] || '').replace(/^#/, '').toUpperCase();
          if (!hex) return;
          const shortToken = tokenShortNames[token] || token;
          // Use theme initial + short token name to keep it compact
          const themePrefix = theme === 'light' ? 'l' : (theme === 'dark' ? 'd' : theme);
          parts.push(`${themePrefix}${shortToken}=${hex}`);
        });
      });
    } catch(e) {}
    
    if (parts.length) {
      location.hash = parts.join(',');
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
  } catch (e) {}
}

parseHashToOverrides();
restoreHarmonyModeFromStorage();

// Initialize theme from saved preference or prefers-color-scheme BEFORE generating
(function initThemeFromPreference(){
  const saved = localStorage.getItem('ui-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

generatePalette();
attachPaletteTransferHandlers();
initColorPicker();
// Load USWDS colors for snapping
uswds.loadUswds().then(()=>{ window.uswds = uswds; }).catch(()=>{});

$('#generateBtn').on('click', function(e) {
  // If the user checked 'Clear custom overrides', clear them before generating
  const clear = document.getElementById('clearOverrides');
  if (clear && clear.checked) {
    try { window.CUSTOM_COLOR_OVERRIDES = {}; localStorage.removeItem('customColorOverrides'); } catch (e) {}
    try { history.replaceState(null,'', location.pathname + location.search); } catch(e){}
  }
  generatePalette();
  e.preventDefault();
});

function closeRefineMenu() {
  const menu = document.getElementById('refineMenu');
  const btn = document.getElementById('refineBtn');
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleRefineMenu() {
  const menu = document.getElementById('refineMenu');
  const btn = document.getElementById('refineBtn');
  if (!menu || !btn) return;
  const nextHidden = !menu.hidden;
  menu.hidden = nextHidden;
  btn.setAttribute('aria-expanded', nextHidden ? 'false' : 'true');
}

function initRefineControls() {
  const btn = document.getElementById('refineBtn');
  const menu = document.getElementById('refineMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', function(e){
    e.preventDefault();
    toggleRefineMenu();
  });

  document.addEventListener('click', function(e){
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      closeRefineMenu();
    }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      closeRefineMenu();
    }
  });

  menu.querySelectorAll('.refine-menu__item').forEach(function(item){
    item.addEventListener('click', function(ev){
      ev.preventDefault();
      const action = item.getAttribute('data-refine-action');
      closeRefineMenu();
      if (action === 'snap') {
        refineSnapToUswds();
      } else if (action === 'fix-contrast') {
        refineFixContrast();
      }
    });
  });
}

let pendingGenerateTimer = null;
function schedulePaletteRefresh() {
  clearTimeout(pendingGenerateTimer);
  pendingGenerateTimer = setTimeout(function(){
    try { generatePalette(); } catch (e) { console.info('Palette refresh failed', e); }
  }, 180);
}

['canvasContrast','cardContrast','softContrast','strongContrast','neutralSaturation','neutralContrast','darkModeSaturation'].forEach(function(id){
  const el = document.getElementById(id);
  if (!el) return;
  ['input','change'].forEach(function(evt){
    el.addEventListener(evt, schedulePaletteRefresh);
  });
});

// Copy CSS variables button in transfer panel
const copyCssBtn = document.getElementById('copyCssBtn');
if (copyCssBtn) {
  copyCssBtn.addEventListener('click', function(e){
    e.preventDefault();
    try { copyCssVariables(); } catch (err) {}
  });
}

// Page-level theme toggle (header button)
function updateThemeToggleUI() {
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeToggleIcon');
  if (!btn || !icon) return;
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = theme === 'dark';
  btn.setAttribute('aria-pressed', String(isDark));
  // show the opposite symbol as an inline SVG to ensure visibility
  icon.innerHTML = isDark ? getSunSvg() : getMoonSvg();
}

function getSunSvg(){
  return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4v2M12 18v2M4 12h2M18 12h2M5.6 5.6l1.4 1.4M16.999 16.999l1.414 1.414M5.6 18.4l1.4-1.4M16.999 7.001l1.414-1.414M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function getMoonSvg(){
  return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function(e) {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      updateThemeToggleUI();
      try { localStorage.setItem('ui-theme', next); } catch (e) {}
      setSwatchValues(next);
    });
  }
  updateThemeToggleUI();
  initHarmonyControls();
  initContrastGridControls();
  initRefineControls();
});

$('#randomColorBtn').on('click', function(e) {
  generateRandomColor({ apply: true });
  e.preventDefault();
});

$('#tryBrandColor a').on('click', function(e) {
  var brandColor = $(this).attr('data-color-value');
  $('#accentColor').val(brandColor);
  $('#accentColor').parent().find('.mini-swatch').css('background-color', brandColor);
  try { window.LAST_RAW_ACCENT = brandColor; } catch (err) {}
  try { generatePalette(); } catch (err) {}
  e.preventDefault();
});

$('#accentColor').on('change', function(e) {
  const input = this;
  const raw = (input.value || '').trim();
  const normalized = normalizeColorValue(raw);
  const $mini = $(input).parent().find('.mini-swatch');
  if (normalized) {
    // Use normalized hex and regenerate palette
    input.value = normalized;
    $mini.css('background-color', normalized);
    try { window.generatePalette && window.generatePalette(); } catch (err) {}
    try { input.removeAttribute('aria-invalid'); } catch(e) {}
    setTransferStatus('');
  } else {
    try { input.setAttribute('aria-invalid', 'true'); } catch(e) {}
    setTransferStatus('Invalid color value — enter a color name, hex, or rgb()', true);
  }
});

// Allow pressing Enter while editing the accent input to apply immediately
$('#accentColor').on('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    // trigger the change handler logic
    $(this).trigger('change');
  }
});

function flashSwatches(ids = []) {
  if (!ids.length) return;
  ids.forEach(function(id){
    const nodes = document.querySelectorAll(`[data-swatch-id="${id}"]`);
    nodes.forEach(function(node){
      node.classList.remove('swatch-flash');
      // force reflow to restart animation
      void node.offsetWidth;
      node.classList.add('swatch-flash');
      setTimeout(function(){ node.classList.remove('swatch-flash'); }, 1300);
    });
  });
}

function attachPaletteTransferHandlers() {
  const exportButton = document.getElementById('exportPaletteCsv');
  if (exportButton) {
    exportButton.addEventListener('click', function(e) {
      e.preventDefault();
      downloadPaletteCsv();
    });
  }

  const importInput = document.getElementById('importPaletteCsv');
  if (importInput) {
    importInput.addEventListener('change', function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const applied = applyImportedPaletteCsv(evt.target.result || '');
          setTransferStatus(`Applied ${applied} token${applied === 1 ? '' : 's'} from ${file.name}.`);
        } catch (error) {
          setTransferStatus(error.message || 'Unable to import palette.', true);
        }
      };
      reader.onerror = function() {
        setTransferStatus('Unable to read the selected CSV file.', true);
      };
      reader.readAsText(file);
    });
  }
}

// Determine whether a swatch is explicitly scoped to a light or dark container
function getThemeModeFromParent(element) {
  const attrScoped = element.closest('[data-theme-mode]');
  if (attrScoped) {
    return attrScoped.getAttribute('data-theme-mode');
  }

  const idScoped = element.closest('[id$="-light"], [id$="-dark"]');
  if (idScoped && typeof idScoped.id === 'string') {
    if (idScoped.id.endsWith('-light')) return 'light';
    if (idScoped.id.endsWith('-dark')) return 'dark';
  }

  return null;
}

function primeSwatchMetadata() {
  document.querySelectorAll('.swatch').forEach(function (swatch) {
    if (!swatch.dataset.swatchId) {
      const fallbackId = swatch.getAttribute('id');
      if (fallbackId) {
        swatch.dataset.swatchId = fallbackId;
      }
    }
  });
}

// Highlight demo elements that match the swatch color on hover/focus
function installSwatchHighlighting() {
  function normalizeColor(str) {
    try { return chroma(str); } catch (e) { return null; }
  }

  function colorDistance(a, b) {
    try {
      return chroma.distance(a, b, 'lab');
    } catch (e) { return Infinity; }
  }

  function extractBoxShadowColors(boxShadow) {
    if (!boxShadow) return [];
    // crude extraction of color-like segments from box-shadow
    const parts = boxShadow.split(',');
    const colors = [];
    parts.forEach(function(p){
      const m = p.match(/(rgba?\([^\)]+\)|#[0-9A-Fa-f]{3,8}|hsla?\([^\)]+\))/);
      if (m && m[1]) colors.push(m[1]);
    });
    return colors;
  }

  function findMatchingElements(panel, targetChroma) {
    const matches = [];
    if (!panel || !targetChroma) return matches;
    const candidates = panel.querySelectorAll('*');
    candidates.forEach(function(el) {
      try {
        const cs = window.getComputedStyle(el);
        const props = [cs.getPropertyValue('background-color'), cs.getPropertyValue('color'), cs.getPropertyValue('border-color'), cs.getPropertyValue('outline-color')];
        // include box-shadow colors
        const shadowColors = extractBoxShadowColors(cs.getPropertyValue('box-shadow'));
        shadowColors.forEach(function(sc){ props.push(sc); });
        // if element is SVG or has stroke/fill, include those
        if (el instanceof SVGElement) {
          try {
            const stroke = el.getAttribute('stroke');
            const fill = el.getAttribute('fill');
            if (stroke) props.push(stroke);
            if (fill) props.push(fill);
          } catch (e) {}
        } else {
          try {
            const stroke = cs.getPropertyValue('stroke');
            const fill = cs.getPropertyValue('fill');
            if (stroke) props.push(stroke);
            if (fill) props.push(fill);
          } catch (e) {}
        }
        for (let i = 0; i < props.length; i += 1) {
          const val = props[i];
          if (!val) continue;
          const cand = normalizeColor(val);
          if (!cand) continue;
          const dist = colorDistance(cand, targetChroma);
          if (dist <= 6) { // threshold for perceptual similarity
            matches.push(el);
            break;
          }
        }
      } catch (e) {}
    });
    return matches;
  }

  function applyHighlight(swatchEl, add) {
    const parentTheme = getThemeModeFromParent(swatchEl) || $('html').attr('data-theme');
    // find the demo panel corresponding to the theme
    const panel = document.querySelector(`.demo-panel[data-theme-mode="${parentTheme}"]`);
    const colorAttr = swatchEl.getAttribute(`data-${parentTheme}-color`) || swatchEl.getAttribute('data-light-color') || swatchEl.getAttribute('data-dark-color') || '';
    const targetHex = normalizeColor(colorAttr);
    if (!targetHex) return;
    const elements = findMatchingElements(panel, targetHex);
    elements.forEach(function(el){
      if (add) el.classList.add('palette-highlight'); else el.classList.remove('palette-highlight');
    });
  }

  document.querySelectorAll('.swatch').forEach(function(s){
    s.setAttribute('tabindex', '0');
    s.addEventListener('mouseenter', function(){ applyHighlight(s, true); });
    s.addEventListener('mouseleave', function(){ applyHighlight(s, false); });
    s.addEventListener('focus', function(){ applyHighlight(s, true); });
    s.addEventListener('blur', function(){ applyHighlight(s, false); });
  });
}

// Install highlighting when DOM is ready
document.addEventListener('DOMContentLoaded', function(){
  primeSwatchMetadata();
  installSwatchHighlighting();
});

function dedupeIdsByTheme() {
  const elementsById = {};
  document.querySelectorAll('[id]').forEach(function (element) {
    const existingId = element.getAttribute('id');
    if (!existingId) return;
    if (!elementsById[existingId]) {
      elementsById[existingId] = [];
    }
    elementsById[existingId].push(element);
  });

  Object.keys(elementsById).forEach(function (id) {
    const elements = elementsById[id];
    if (elements.length < 2) {
      return;
    }
    const counters = {};
    elements.forEach(function (element) {
      const theme = getThemeModeFromParent(element) || 'global';
      const counterKey = `${id}::${theme}`;
      counters[counterKey] = (counters[counterKey] || 0) + 1;
      const suffixParts = [];
      if (theme !== 'global') {
        suffixParts.push(theme);
      }
      suffixParts.push(counters[counterKey]);
      const dedupedId = `${id}-${suffixParts.join('-')}`;
      element.setAttribute('data-shared-id', id);
      element.id = dedupedId;
    });
  });
}

function initializeScopedIds() {
  primeSwatchMetadata();
  dedupeIdsByTheme();
}

// Re-displ
function setSwatchValues(theme, options = {}) {
  const { scopedOnly = false } = options;
  $('.swatch').each(function() {
    const parentTheme = getThemeModeFromParent(this);
    if (parentTheme && parentTheme !== theme) {
      return;
    }
    if (scopedOnly && !parentTheme) {
      return;
    }

    var $swatch = $(this);
    var $value = $swatch.find('.value');
    var displayValue = $swatch.attr(`data-${theme}-color`) || 'N/A';
    $value.text(displayValue);
    
    // Add click-to-copy functionality to the value span
    if (displayValue && displayValue !== 'N/A') {
      $value.css('cursor', 'pointer');
      $value.attr('title', 'Click to copy');
      $value.off('click').on('click', function(e) {
        e.stopPropagation(); // Prevent swatch click event
        const color = $(this).text();
        navigator.clipboard.writeText(color).then(function() {
          const original = $value.text();
          $value.text('Copied!');
          setTimeout(function() { $value.text(original); }, 1000);
        }).catch(function() {
          console.warn('Failed to copy:', color);
        });
      });
    }
  });
}

function setCssColor(theme, swatchId, cssVariable, color) {
  const styleElement = document.head.querySelector(`style[data-theme="${theme}"]`) || createThemeStyle(theme);
  // Declare CSS variables scoped to both page-level theme attribute and local data-theme-mode parents
  try {
    styleElement.sheet.insertRule(
      `[data-theme="${theme}"] { ${cssVariable}: ${color}; }`,
      styleElement.sheet.cssRules.length
    );
    styleElement.sheet.insertRule(
      `[data-theme-mode="${theme}"] { ${cssVariable}: ${color}; }`,
      styleElement.sheet.cssRules.length
    );
  } catch (e) {
    // Fallback: set on root
    try { root.style.setProperty(cssVariable.replace('--', '--ui-') || cssVariable, color); } catch (err) {}
    try { root.style.setProperty(cssVariable, color); } catch (err) {}
  }
  const swatches = document.querySelectorAll(`.swatch[data-swatch-id="${swatchId}"]`);
  swatches.forEach(function(swatch) {
    const parentTheme = getThemeModeFromParent(swatch);
    if (parentTheme && parentTheme !== theme) {
      return;
    }
    swatch.setAttribute(`data-${theme}-color`, color);
  });

  // If this cssVariable looks like a button or icon background token, compute
  // an accessible foreground and write fallbacks so the UI stays accessible
  // even when browsers don't support color-contrast().
  try {
    const normalized = cssVariable.toLowerCase();
    if (normalized.includes('btn') || normalized.includes('action') || normalized.includes('accent')) {
      const fg = computeAccessibleForeground(color);
      // write to CSS custom properties scoped to theme
      writeCssVariable(theme, '--btn-contrast-fallback', fg);
      // also set icon fallback to the same or a high-contrast alternative
      writeCssVariable(theme, '--icon-contrast-fallback', fg === '#000000' ? '#111111' : '#ffffff');
    }
  } catch (e) {
    // noop; best-effort
  }

  // Ensure any buttons on the page that derive their background from dynamic
  // swatches get an enforced foreground color that meets WCAG 2 AA.
  try {
    enforceAccessibleForegrounds(theme);
  } catch (e) {}
}

// Helper: insert or update a theme-scoped CSS variable in a <style data-theme> block
function writeCssVariable(theme, varName, value) {
  const styleElement = document.head.querySelector(`style[data-theme="${theme}"]`) || createThemeStyle(theme);
  const ruleText = `[data-theme="${theme}"] { ${varName}: ${value}; }`;
  try {
    // Try to find existing rule and replace, otherwise insert
    const sheet = styleElement.sheet;
    for (let i = 0; i < sheet.cssRules.length; i++) {
      const r = sheet.cssRules[i];
      if (r.cssText && r.cssText.indexOf(varName) !== -1) {
        sheet.deleteRule(i);
        break;
      }
    }
    sheet.insertRule(ruleText, sheet.cssRules.length);
  } catch (err) {
    document.documentElement.style.setProperty(varName, value);
  }
}

// Compute accessible foreground (simple WCAG contrast: choose white or black)
function computeAccessibleForeground(bgColor) {
  try {
    const rgb = parseCssColor(bgColor);
    if (!rgb) return '#ffffff';
    const Lb = relativeLuminance(rgb.r, rgb.g, rgb.b);
    // contrast against white and black
    const contrastWhite = (1.05) / (Lb + 0.05);
    const contrastBlack = (Lb + 0.05) / 0.05;
    if (contrastWhite >= 4.5) return '#ffffff';
    if (contrastBlack >= 4.5) return '#000000';

    // Neither black nor white meets 4.5:1 — compute a grayscale foreground luminance
    // If the foreground must be lighter than background:
    const LfNeededIfLighter = 4.5 * (Lb + 0.05) - 0.05;
    // If the foreground must be darker than background:
    const LfNeededIfDarker = (Lb + 0.05) / 4.5 - 0.05;

    let Lf;
    if (LfNeededIfLighter <= 1) {
      Lf = Math.min(1, LfNeededIfLighter);
    } else {
      Lf = Math.max(0, LfNeededIfDarker);
    }

    // Convert linear luminance for gray to sRGB channel value
    const srgb = linearToSrgb(Lf);
    const hex = toHex(Math.round(srgb * 255));
    return `#${hex}${hex}${hex}`;
  } catch (e) {
    return '#ffffff';
  }
}

function linearToSrgb(c) {
  // c is linear channel 0..1
  if (c <= 0.0031308) return c * 12.92;
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function toHex(v) {
  const s = v.toString(16);
  return (s.length === 1 ? '0' + s : s).toUpperCase();
}

function relativeLuminance(r, g, b) {
  // r,g,b in 0..255
  const srgb = [r, g, b].map(v => v / 255).map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function parseCssColor(input) {
  if (!input) return null;
  input = input.trim();
  // hex
  const hex = /^#([0-9a-f]{3,8})$/i.exec(input);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
    }
    if (h.length === 6 || h.length === 8) {
      return { r: parseInt(h.substring(0,2), 16), g: parseInt(h.substring(2,4), 16), b: parseInt(h.substring(4,6), 16) };
    }
  }
  // rgb(a)
  const rgb = /^rgba?\(([^)]+)\)$/.exec(input);
  if (rgb) {
    const parts = rgb[1].split(',').map(p => p.trim());
    const r = parseFloat(parts[0]);
    const g = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }
  return null;
}

// Enhance enforceAccessibleForegrounds to adjust background colors dynamically
function enforceAccessibleForegrounds(theme) {
  const selectors = ['.btn', '.blue-button', '.usa-button', '.btn-secondary', '#generateBtn', '#refineBtn', '#exportPaletteCsv', '#copyCssBtn'];
  const nodes = document.querySelectorAll(selectors.join(','));
  nodes.forEach(function(node) {
    try {
      const cs = window.getComputedStyle(node);
      let bg = cs.backgroundColor;
      let fg = cs.color;

      // Resolve transparent backgrounds
      if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
        let ancestor = node.parentElement;
        while (ancestor && (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)')) {
          const aCs = window.getComputedStyle(ancestor);
          bg = aCs.backgroundColor;
          ancestor = ancestor.parentElement;
        }
      }
      if (!bg) return;

      // Compute accessible foreground
      fg = computeAccessibleForeground(bg);

      // If foreground cannot meet contrast, adjust background
      const contrast = computeContrastRatio(fg, bg);
      if (contrast < 4.5) {
        bg = adjustBackgroundForContrast(bg, fg);
        node.style.backgroundColor = bg;
        fg = computeAccessibleForeground(bg);
      }

      // Apply inline styles
      node.style.color = fg;
    } catch (e) {
      // Ignore per-node errors
    }
  });
}

// Adjust background color to meet contrast requirements
function adjustBackgroundForContrast(bgColor, fgColor) {
  const rgb = parseCssColor(bgColor);
  if (!rgb) return bgColor;

  let Lb = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const Lf = relativeLuminance(...parseCssColor(fgColor));

  // Darken background if needed
  if (Lb > Lf) {
    Lb = Math.max(0, Lb - 0.1);
  } else {
    Lb = Math.min(1, Lb + 0.1);
  }

  const srgb = linearToSrgb(Lb);
  const hex = toHex(Math.round(srgb * 255));
  return `#${hex}${hex}${hex}`;
}

function getHarmonyMode() {
  const mode = (window.HARMONY_STATE && window.HARMONY_STATE.mode) || HARMONY_DEFAULT;
  const valid = HARMONY_MODES.some(function(m) { return m.id === mode; });
  return valid ? mode : HARMONY_DEFAULT;
}

function setHarmonyMode(mode, opts = {}) {
  const { persist = true, syncUi = true } = opts;
  const next = HARMONY_MODES.some(function(m) { return m.id === mode; }) ? mode : HARMONY_DEFAULT;
  window.HARMONY_STATE = window.HARMONY_STATE || {};
  window.HARMONY_STATE.mode = next;

  if (persist) {
    try { localStorage.setItem('harmonyMode', next); } catch (e) {}
  }
  if (syncUi) {
    const select = document.getElementById('harmonyMode');
    if (select) {
      select.value = next;
    }
  }
  try { setHashFromOverrides(); } catch (e) {}
  return next;
}

function restoreHarmonyModeFromStorage() {
  try {
    if (getHarmonyMode() !== HARMONY_DEFAULT) return;
    const stored = localStorage.getItem('harmonyMode');
    if (stored && HARMONY_MODES.some(function(m) { return m.id === stored; })) {
      setHarmonyMode(stored, { syncUi: true, persist: false });
    }
  } catch (e) {}
}

function pickRandomHarmonyMode() {
  const choices = HARMONY_MODES.filter(function(m) { return m.id !== 'none'; });
  if (!choices.length) return HARMONY_DEFAULT;
  const idx = Math.floor(Math.random() * choices.length);
  return choices[idx].id;
}

function initHarmonyControls() {
  const select = document.getElementById('harmonyMode');
  if (select && !select.options.length) {
    HARMONY_MODES.forEach(function(mode) {
      const opt = document.createElement('option');
      opt.value = mode.id;
      opt.textContent = mode.label;
      select.appendChild(opt);
    });
  }

  if (select) {
    select.value = getHarmonyMode();
    select.addEventListener('change', function(e) {
      setHarmonyMode(e.target.value);
      generatePalette();
    });
  }

  const randomBtn = document.getElementById('randomHarmonyBtn');
  if (randomBtn) {
    randomBtn.addEventListener('click', function(e) {
      e.preventDefault();
      const choice = pickRandomHarmonyMode();
      setHarmonyMode(choice);
      generatePalette();
    });
  }
}

// ============================================
// Harmony utilities (OKLCH-based, deterministic)
// ============================================
function clampHue(h) {
  if (Number.isNaN(h)) return 0;
  let hue = h % 360;
  if (hue < 0) hue += 360;
  return hue;
}

function clampLightness(l) {
  // Keep tones in a safe UI range
  return Math.min(Math.max(l, 0.08), 0.95);
}

function clampChroma(c) {
  // OKLCH chroma above ~0.37 often clips on sRGB
  return Math.min(Math.max(c, 0), 0.37);
}

function toOklchSafe(hex) {
  try {
    const [l, c, h] = chroma(hex).oklch();
    // Fallback hue if chroma is 0 (achromatic)
    const hue = Number.isNaN(h) ? clampHue(chroma(hex).get('hsl.h') || 0) : clampHue(h);
    return { l: clampLightness(l), c: clampChroma(c), h: hue };
  } catch (e) {
    return { l: 0.6, c: 0.1, h: 0 };
  }
}

function fromOklch(parts) {
  const l = clampLightness(parts.l);
  const c = clampChroma(parts.c);
  const h = clampHue(parts.h);
  return chroma.oklch(l, c, h).hex();
}

function rotateHueValue(h, delta) {
  return clampHue(h + delta);
}

function enforceContrast(hexColor, bgHex, minContrast, directionHint) {
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

function getHarmonyHuePlan(seedHue, mode) {
  const h = clampHue(seedHue);
  switch (mode) {
    case 'analogous-30':
      return {
        accentNonContentBaseline: rotateHueValue(h, -30),
        accentNonContentStrong: rotateHueValue(h, 30),
        accentContentStrong: h
      };
    case 'analogous-60':
      return {
        accentNonContentBaseline: rotateHueValue(h, -60),
        accentNonContentStrong: rotateHueValue(h, 60),
        accentContentStrong: h
      };
    case 'complementary':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 180),
        accentContentStrong: rotateHueValue(h, 180)
      };
    case 'split-complementary':
      return {
        accentNonContentBaseline: rotateHueValue(h, 150),
        accentNonContentStrong: rotateHueValue(h, 210),
        accentContentStrong: h
      };
    case 'triadic':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 120),
        accentContentStrong: rotateHueValue(h, 240)
      };
    case 'tetradic':
      return {
        accentNonContentBaseline: h,
        accentNonContentStrong: rotateHueValue(h, 180),
        accentContentStrong: rotateHueValue(h, 60)
      };
    default:
      return null;
  }
}

function rebuildColorWithHue(baseHex, targetHue) {
  const base = toOklchSafe(baseHex);
  return fromOklch({ ...base, h: clampHue(targetHue) });
}

function applyHarmonyLayer(mode, options = {}) {
  if (!mode || mode === 'none') return;

  const seedValue = (document.getElementById('accentColor') && document.getElementById('accentColor').value) || '';
  const normalizedSeed = normalizeColorValue(seedValue) || seedValue;
  const seedOklch = toOklchSafe(normalizedSeed || '#888888');
  const huePlan = getHarmonyHuePlan(seedOklch.h, mode);
  if (!huePlan) return;

  const nonContentContrast = options.nonContentContrast || wcagNonContentContrast;
  const softContrast = options.softContrast || 1.1;
  const strongContrastTarget = options.strongContrast || 1.7;
  const contentContrast = options.contentContrast || wcagContentContrast;

  ['light', 'dark'].forEach(function(theme) {
    const card = getSwatchColor(theme, 'card');
    const canvas = getSwatchColor(theme, 'canvas') || card;

    const baseNonContentBaseline = getSwatchColor(theme, 'accentNonContentBaseline');
    const baseNonContentStrong = getSwatchColor(theme, 'accentNonContentStrong');
    const baseContentStrong = getSwatchColor(theme, 'accentContentStrong');

    if (!card || !baseNonContentStrong || !baseContentStrong) return;

    const remappedBaseline = enforceContrast(
      rebuildColorWithHue(baseNonContentBaseline || baseNonContentStrong, huePlan.accentNonContentBaseline),
      card,
      nonContentContrast,
      theme === 'dark' ? 'increase' : 'decrease'
    );

    const remappedNonContentStrong = enforceContrast(
      rebuildColorWithHue(baseNonContentStrong, huePlan.accentNonContentStrong),
      card,
      strongContrastTarget,
      theme === 'dark' ? 'increase' : 'decrease'
    );

    const remappedContentStrong = enforceContrast(
      rebuildColorWithHue(baseContentStrong, huePlan.accentContentStrong),
      canvas,
      contentContrast,
      theme === 'dark' ? 'increase' : 'decrease'
    );

    // Derived tokens stay tied to strong accents
    const remappedNonContentSoft = decreaseOpacityToContrast(remappedNonContentStrong, card, softContrast);
    const remappedNonContentSubdued = decreaseOpacityToContrast(remappedNonContentStrong, card, nonContentContrast);
    const remappedContentSubdued = decreaseOpacityToContrast(remappedContentStrong, card, contentContrast);

    setCssColor(theme, 'accentNonContentBaseline', '--color-accentNonContentBaseline', remappedBaseline);
    setCssColor(theme, 'accentNonContentStrong', '--color-accentNonContentStrong', remappedNonContentStrong);
    setCssColor(theme, 'accentNonContentSoft', '--color-accentNonContentSoft', remappedNonContentSoft);
    setCssColor(theme, 'accentNonContentSubdued', '--color-accentNonContentSubdued', remappedNonContentSubdued);
    setCssColor(theme, 'accentContentStrong', '--color-accentContentStrong', remappedContentStrong);
    setCssColor(theme, 'accentContentSubdued', '--color-accentContentSubdued', remappedContentSubdued);
  });
}

// Insert a random seed value; optionally regenerate immediately
function generateRandomColor(options = {}) {
  const { apply = false } = options;
  const randomColor = chroma.random().hex().toUpperCase();
  $('#accentColor').val(randomColor);
  $('#accentColor').parent().find('.mini-swatch').css('background-color', randomColor);
  try { window.LAST_RAW_ACCENT = randomColor; } catch (e) {}
  if (apply) {
    try { generatePalette(); } catch (e) {}
  }
}

// expose generatePalette globally for small modules to call
window.generatePalette = generatePalette;

initializeScopedIds();
generateRandomColor();
// Parse any color overrides from the URL hash before generating
/**
 * Parse URL hash into color overrides and settings.
 * 
 * Supported formats:
 *   - seed=COLOR         : Set the seed/accent color (e.g. seed=A7C39F or seed=red)
 *   - harm=MODE          : Set harmony mode (e.g. harm=split-complementary)
 *   - lTOKEN=HEX         : Set light theme token (e.g. lcanv=E5F6CA, lcrd=F0FADF)
 *   - dTOKEN=HEX         : Set dark theme token (e.g. dcanv=232422)
 * 
 * Token abbreviations: canv=canvas, crd=card, ans=accentNonContentStrong,
 *                      ansub=accentNonContentSubdued, etc.
 * 
 * Examples:
 *   #seed=A7C39F,harm=split-complementary
 *   #seed=red,harm=analogous,lcanv=E5F6CA,dcard=313230
 *   #seed=FF0000
 * 
 * Backwards compatible with old format: #colors=light.seed=AA00AA,accent=red,harmony=triadic
 */
function parseHashToOverrides() {
  try {
    const raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    
    // Split top-level comma-separated pairs
    const pairs = raw.split(',').map(s=>s.trim()).filter(Boolean);
    const obj = {};
    
    // Map short token names back to full names
    const shortToFullToken = {
      'seed': 'seed',
      'canv': 'canvas',
      'crd': 'card',
      'anb': 'accentNonContentBaseline',
      'ans': 'accentNonContentStrong',
      'ansub': 'accentNonContentSubdued',
      'ansf': 'accentNonContentSoft',
      'acb': 'accentContentBaseline',
      'acs': 'accentContentStrong',
      'acsub': 'accentContentSubdued',
      'acsf': 'accentContentSoft',
      'nnb': 'neutralNonContentBaseline',
      'nns': 'neutralNonContentStrong',
      'nnsub': 'neutralNonContentSubdued',
      'nnsf': 'neutralNonContentSoft',
      'ncb': 'neutralContentBaseline',
      'ncs': 'neutralContentStrong',
      'ncsub': 'neutralContentSubdued',
      'ncsf': 'neutralContentSoft'
    };
    
    pairs.forEach(function(pair){
      const kv = pair.split('=');
      if (kv.length < 2) return;
      const key = decodeURIComponent(kv[0]);
      const rest = kv.slice(1).join('=');
      
      // Handle new short format: seed=..., harm=..., lcanv=..., dcanv=...
      if (key === 'seed') {
        const rawAccent = decodeURIComponent(rest || '').trim();
        if (rawAccent) {
          window.LAST_RAW_ACCENT = rawAccent;
          try {
            const accInput = document.getElementById('accentColor');
            if (accInput) {
              accInput.value = rawAccent;
              accInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch(e){}
          try { updateContrastReport(); } catch (e) { console.info('Contrast report update failed', e); }
        }
        return;
      }
      
      if (key === 'harm' || key === 'harmony') {
        const mode = decodeURIComponent(rest || '').trim();
        if (mode) {
          setHarmonyMode(mode, { syncUi: false, persist: false });
        }
        return;
      }
      
      // Handle old format: colors=light.token=HEX,... (for backwards compatibility)
      if (key === 'colors') {
        // This is the old format combined into one param, parse recursively
        const oldPairs = rest.split(',').map(s=>s.trim()).filter(Boolean);
        oldPairs.forEach(function(oldPair) {
          const oldKv = oldPair.split('=');
          if (oldKv.length >= 2) {
            const oldKey = oldKv[0];
            const oldHex = '#' + oldKv.slice(1).join('=').replace(/^#/, '').toUpperCase();
            const parts = oldKey.split('.');
            if (parts.length === 2) {
              const theme = parts[0];
              const token = parts[1];
              obj[theme] = obj[theme] || {};
              obj[theme][token] = oldHex;
            } else if (parts.length === 1) {
              obj.light = obj.light || {};
              obj.light[parts[0]] = oldHex;
            }
          }
        });
        return;
      }
      
      // Handle new format: lcanv=HEX, dcanv=HEX, etc.
      if (key.length >= 2) {
        const themePrefix = key.charAt(0);
        const tokenShort = key.substring(1);
        const theme = themePrefix === 'l' ? 'light' : (themePrefix === 'd' ? 'dark' : null);
        const token = shortToFullToken[tokenShort] || tokenShort;
        
        if (theme && token) {
          const hex = '#' + rest.replace(/^#/, '').toUpperCase();
          obj[theme] = obj[theme] || {};
          obj[theme][token] = hex;
        }
      }
    });
    
    if (Object.keys(obj).length) {
      try { localStorage.setItem('customColorOverrides', JSON.stringify(obj)); } catch (e) {}
      window.CUSTOM_COLOR_OVERRIDES = obj;
      return obj;
    }
  }
  } catch (e) {}
  return null;
}

/**
 * Generate URL hash from current color overrides and settings.
 * 
 * Creates a compact, shareable URL format:
 *   seed=COLOR          : Seed/accent color
 *   harm=MODE           : Harmony mode
 *   lTOKEN=HEX          : Light theme token overrides (using abbreviations)
 *   dTOKEN=HEX          : Dark theme token overrides (using abbreviations)
 * 
 * Example output: #seed=A7C39F,harm=split-complementary,lcanv=E5F6CA
 */
function setHashFromOverrides() {
  try {
    const parts = [];
    
    // Include seed color (shorthand for accent color)
    try {
      const rawAccent = window.LAST_RAW_ACCENT || (document.getElementById('accentColor') && document.getElementById('accentColor').value) || '';
      if (rawAccent) {
        const accentValue = (window.LAST_RAW_ACCENT || rawAccent).toString().replace(/^#/, '');
        parts.push(`seed=${encodeURIComponent(accentValue)}`);
      }
    } catch(e) {}
    
    // Include harmony mode
    try {
      const harmonyMode = getHarmonyMode();
      if (harmonyMode && harmonyMode !== HARMONY_DEFAULT) {
        parts.push(`harm=${encodeURIComponent(harmonyMode)}`);
      }
    } catch (e) {}
    
    // Include custom color overrides for specific tokens (short param names)
    try {
      const obj = window.CUSTOM_COLOR_OVERRIDES || JSON.parse(localStorage.getItem('customColorOverrides') || '{}');
      const tokenShortNames = {
        // Canvas/background tokens
        'canvas': 'canv',
        'card': 'crd',
        // Accent colors (non-content)
        'accentNonContentBaseline': 'anb',
        'accentNonContentStrong': 'ans',
        'accentNonContentSubdued': 'ansub',
        'accentNonContentSoft': 'ansf',
        // Accent colors (content)
        'accentContentBaseline': 'acb',
        'accentContentStrong': 'acs',
        'accentContentSubdued': 'acsub',
        'accentContentSoft': 'acsf',
        // Neutral colors (non-content)
        'neutralNonContentBaseline': 'nnb',
        'neutralNonContentStrong': 'nns',
        'neutralNonContentSubdued': 'nnsub',
        'neutralNonContentSoft': 'nnsf',
        // Neutral colors (content)
        'neutralContentBaseline': 'ncb',
        'neutralContentStrong': 'ncs',
        'neutralContentSubdued': 'ncsub',
        'neutralContentSoft': 'ncsf'
      };
      
      Object.keys(obj).forEach(function(theme){
        const tokens = obj[theme] || {};
        Object.keys(tokens).forEach(function(token){
          if (token === 'seed') return; // seed is handled above
          const hex = (tokens[token] || '').replace(/^#/, '').toUpperCase();
          if (!hex) return;
          const shortToken = tokenShortNames[token] || token;
          // Use theme initial + short token name to keep it compact
          const themePrefix = theme === 'light' ? 'l' : (theme === 'dark' ? 'd' : theme);
          parts.push(`${themePrefix}${shortToken}=${hex}`);
        });
      });
    } catch(e) {}
    
    if (parts.length) {
      location.hash = parts.join(',');
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
  } catch (e) {}
}

parseHashToOverrides();
restoreHarmonyModeFromStorage();

// Initialize theme from saved preference or prefers-color-scheme BEFORE generating
(function initThemeFromPreference(){
  const saved = localStorage.getItem('ui-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

generatePalette();
attachPaletteTransferHandlers();
initColorPicker();
// Load USWDS colors for snapping
uswds.loadUswds().then(()=>{ window.uswds = uswds; }).catch(()=>{});

$('#generateBtn').on('click', function(e) {
  // If the user checked 'Clear custom overrides', clear them before generating
  const clear = document.getElementById('clearOverrides');
  if (clear && clear.checked) {
    try { window.CUSTOM_COLOR_OVERRIDES = {}; localStorage.removeItem('customColorOverrides'); } catch (e) {}
    try { history.replaceState(null,'', location.pathname + location.search); } catch(e){}
  }
  generatePalette();
  e.preventDefault();
});

function closeRefineMenu() {
  const menu = document.getElementById('refineMenu');
  const btn = document.getElementById('refineBtn');
  if (menu) menu.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleRefineMenu() {
  const menu = document.getElementById('refineMenu');
  const btn = document.getElementById('refineBtn');
  if (!menu || !btn) return;
  const nextHidden = !menu.hidden;
  menu.hidden = nextHidden;
  btn.setAttribute('aria-expanded', nextHidden ? 'false' : 'true');
}

function initRefineControls() {
  const btn = document.getElementById('refineBtn');
  const menu = document.getElementById('refineMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', function(e){
    e.preventDefault();
    toggleRefineMenu();
  });

  document.addEventListener('click', function(e){
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      closeRefineMenu();
    }
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      closeRefineMenu();
    }
  });

  menu.querySelectorAll('.refine-menu__item').forEach(function(item){
    item.addEventListener('click', function(ev){
      ev.preventDefault();
      const action = item.getAttribute('data-refine-action');
      closeRefineMenu();
      if (action === 'snap') {
        refineSnapToUswds();
      } else if (action === 'fix-contrast') {
        refineFixContrast();
      }
    });
  });
}

let pendingGenerateTimer = null;
function schedulePaletteRefresh() {
  clearTimeout(pendingGenerateTimer);
  pendingGenerateTimer = setTimeout(function(){
    try { generatePalette(); } catch (e) { console.info('Palette refresh failed', e); }
  }, 180);
}

['canvasContrast','cardContrast','softContrast','strongContrast','neutralSaturation','neutralContrast','darkModeSaturation'].forEach(function(id){
  const el = document.getElementById(id);
  if (!el) return;
  ['input','change'].forEach(function(evt){
    el.addEventListener(evt, schedulePaletteRefresh);
  });
});

// Copy CSS variables button in transfer panel
const copyCssBtn = document.getElementById('copyCssBtn');
if (copyCssBtn) {
  copyCssBtn.addEventListener('click', function(e){
    e.preventDefault();
    try { copyCssVariables(); } catch (err) {}
  });
}

// Page-level theme toggle (header button)
function updateThemeToggleUI() {
  const btn = document.getElementById('themeToggle');
  const icon = document.getElementById('themeToggleIcon');
  if (!btn || !icon) return;
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = theme === 'dark';
  btn.setAttribute('aria-pressed', String(isDark));
  // show the opposite symbol as an inline SVG to ensure visibility
  icon.innerHTML = isDark ? getSunSvg() : getMoonSvg();
}

function getSunSvg(){
  return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4v2M12 18v2M4 12h2M18 12h2M5.6 5.6l1.4 1.4M16.999 16.999l1.414 1.414M5.6 18.4l1.4-1.4M16.999 7.001l1.414-1.414M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function getMoonSvg(){
  return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function(e) {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      updateThemeToggleUI();
      try { localStorage.setItem('ui-theme', next); } catch (e) {}
      setSwatchValues(next);
    });
  }
  updateThemeToggleUI();
  initHarmonyControls();
  initContrastGridControls();
  initRefineControls();
});

$('#randomColorBtn').on('click', function(e) {
  generateRandomColor({ apply: true });
  e.preventDefault();
});

$('#tryBrandColor a').on('click', function(e) {
  var brandColor = $(this).attr('data-color-value');
  $('#accentColor').val(brandColor);
  $('#accentColor').parent().find('.mini-swatch').css('background-color', brandColor);
  try { window.LAST_RAW_ACCENT = brandColor; } catch (err) {}
  try { generatePalette(); } catch (err) {}
  e.preventDefault();
});

$('#accentColor').on('change', function(e) {
  const input = this;
  const raw = (input.value || '').trim();
  const normalized = normalizeColorValue(raw);
  const $mini = $(input).parent().find('.mini-swatch');
  if (normalized) {
    // Use normalized hex and regenerate palette
    input.value = normalized;
    $mini.css('background-color', normalized);
    try { window.generatePalette && window.generatePalette(); } catch (err) {}
    try { input.removeAttribute('aria-invalid'); } catch(e) {}
    setTransferStatus('');
  } else {
    try { input.setAttribute('aria-invalid', 'true'); } catch(e) {}
    setTransferStatus('Invalid color value — enter a color name, hex, or rgb()', true);
  }
});

// Allow pressing Enter while editing the accent input to apply immediately
$('#accentColor').on('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    // trigger the change handler logic
    $(this).trigger('change');
  }
});

function flashSwatches(ids = []) {
  if (!ids.length) return;
  ids.forEach(function(id){
    const nodes = document.querySelectorAll(`[data-swatch-id="${id}"]`);
    nodes.forEach(function(node){
      node.classList.remove('swatch-flash');
      // force reflow to restart animation
      void node.offsetWidth;
      node.classList.add('swatch-flash');
      setTimeout(function(){ node.classList.remove('swatch-flash'); }, 1300);
    });
  });
}

function attachPaletteTransferHandlers() {
  const exportButton = document.getElementById('exportPaletteCsv');
  if (exportButton) {
    exportButton.addEventListener('click', function(e) {
      e.preventDefault();
      downloadPaletteCsv();
    });
  }

  const importInput = document.getElementById('importPaletteCsv');
  if (importInput) {
    importInput.addEventListener('change', function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const applied = applyImportedPaletteCsv(evt.target.result || '');
          setTransferStatus(`Applied ${applied} token${applied === 1 ? '' : 's'} from ${file.name}.`);
        } catch (error) {
          setTransferStatus(error.message || 'Unable to import palette.', true);
        }
      };
      reader.onerror = function() {
        setTransferStatus('Unable to read the selected CSV file.', true);
      };
      reader.readAsText(file);
    });
  }
}

// Determine whether a swatch is explicitly scoped to a light or dark container
function getThemeModeFromParent(element) {
  const attrScoped = element.closest('[data-theme-mode]');
  if (attrScoped) {
    return attrScoped.getAttribute('data-theme-mode');
  }

  const idScoped = element.closest('[id$="-light"], [id$="-dark"]');
  if (idScoped && typeof idScoped.id === 'string') {
    if (idScoped.id.endsWith('-light')) return 'light';
    if (idScoped.id.endsWith('-dark')) return 'dark';
  }

  return null;
}

function primeSwatchMetadata() {
  document.querySelectorAll('.swatch').forEach(function (swatch) {
    if (!swatch.dataset.swatchId) {
      const fallbackId = swatch.getAttribute('id');
      if (fallbackId) {
        swatch.dataset.swatchId = fallbackId;
      }
    }
  });
}

// Highlight demo elements that match the swatch color on hover/focus
function installSwatchHighlighting() {
  function normalizeColor(str) {
    try { return chroma(str); } catch (e) { return null; }
  }

  function colorDistance(a, b) {
    try {
      return chroma.distance(a, b, 'lab');
    } catch (e) { return Infinity; }
  }

  function extractBoxShadowColors(boxShadow) {
    if (!boxShadow) return [];
    // crude extraction of color-like segments from box-shadow
    const parts = boxShadow.split(',');
    const colors = [];
    parts.forEach(function(p){
      const m = p.match(/(rgba?\([^\)]+\)|#[0-9A-Fa-f]{3,8}|hsla?\([^\)]+\))/);
      if (m && m[1]) colors.push(m[1]);
    });
    return colors;
  }

  function findMatchingElements(panel, targetChroma) {
    const matches = [];
    if (!panel || !targetChroma) return matches;
    const candidates = panel.querySelectorAll('*');
    candidates.forEach(function(el) {
      try {
        const cs = window.getComputedStyle(el);
        const props = [cs.getPropertyValue('background-color'), cs.getPropertyValue('color'), cs.getPropertyValue('border-color'), cs.getPropertyValue('outline-color')];
        // include box-shadow colors
        const shadowColors = extractBoxShadowColors(cs.getPropertyValue('box-shadow'));
        shadowColors.forEach(function(sc){ props.push(sc); });
        // if element is SVG or has stroke/fill, include those
        if (el instanceof SVGElement) {
          try {
            const stroke = el.getAttribute('stroke');
            const fill = el.getAttribute('fill');
            if (stroke) props.push(stroke);
            if (fill) props.push(fill);
          } catch (e) {}
        } else {
          try {
            const stroke = cs.getPropertyValue('stroke');
            const fill = cs.getPropertyValue('fill');
            if (stroke) props.push(stroke);
            if (fill) props.push(fill);
          } catch (e) {}
        }
        for (let i = 0; i < props.length; i += 1) {
          const val = props[i];
          if (!val) continue;
          const cand = normalizeColor(val);
          if (!cand) continue;
          const dist = colorDistance(cand, targetChroma);
          if (dist <= 6) { // threshold for perceptual similarity
            matches.push(el);
            break;
          }
        }
      } catch (e) {}
    });
    return matches;
  }

  function applyHighlight(swatchEl, add) {
    const parentTheme = getThemeModeFromParent(swatchEl) || $('html').attr('data-theme');
    // find the demo panel corresponding to the theme
    const panel = document.querySelector(`.demo-panel[data-theme-mode="${parentTheme}"]`);
    const colorAttr = swatchEl.getAttribute(`data-${parentTheme}-color`) || swatchEl.getAttribute('data-light-color') || swatchEl.getAttribute('data-dark-color') || '';
    const targetHex = normalizeColor(colorAttr);
    if (!targetHex) return;
    const elements = findMatchingElements(panel, targetHex);
    elements.forEach(function(el){
      if (add) el.classList.add('palette-highlight'); else el.classList.remove('palette-highlight');
    });
  }

  document.querySelectorAll('.swatch').forEach(function(s){
    s.setAttribute('tabindex', '0');
    s.addEventListener('mouseenter', function(){ applyHighlight(s, true); });
    s.addEventListener('mouseleave', function(){ applyHighlight(s, false); });
    s.addEventListener('focus', function(){ applyHighlight(s, true); });
    s.addEventListener('blur', function(){ applyHighlight(s, false); });
  });
}

// Install highlighting when DOM is ready
document.addEventListener('DOMContentLoaded', function(){
  primeSwatchMetadata();
  installSwatchHighlighting();
});

function dedupeIdsByTheme() {
  const elementsById = {};
  document.querySelectorAll('[id]').forEach(function (element) {
    const existingId = element.getAttribute('id');
    if (!existingId) return;
    if (!elementsById[existingId]) {
      elementsById[existingId] = [];
    }
    elementsById[existingId].push(element);
  });

  Object.keys(elementsById).forEach(function (id) {
    const elements = elementsById[id];
    if (elements.length < 2) {
      return;
    }
    const counters = {};
    elements.forEach(function (element) {
      const theme = getThemeModeFromParent(element) || 'global';
      const counterKey = `${id}::${theme}`;
      counters[counterKey] = (counters[counterKey] || 0) + 1;
      const suffixParts = [];
      if (theme !== 'global') {
        suffixParts.push(theme);
      }
      suffixParts.push(counters[counterKey]);
      const dedupedId = `${id}-${suffixParts.join('-')}`;
      element.setAttribute('data-shared-id', id);
      element.id = dedupedId;
    });
  });
}

function initializeScopedIds() {
  primeSwatchMetadata();
  dedupeIdsByTheme();
}

// Re-displ
function setSwatchValues(theme, options = {}) {
  const { scopedOnly = false } = options;
  $('.swatch').each(function() {
    const parentTheme = getThemeModeFromParent(this);
    if (parentTheme && parentTheme !== theme) {
      return;
    }
    if (scopedOnly && !parentTheme) {
      return;
    }

    var $swatch = $(this);
    var $value = $swatch.find('.value');
    var displayValue = $swatch.attr(`data-${theme}-color`) || 'N/A';
    $value.text(displayValue);
    
    // Add click-to-copy functionality to the value span
    if (displayValue && displayValue !== 'N/A') {
      $value.css('cursor', 'pointer');
      $value.attr('title', 'Click to copy');
      $value.off('click').on('click', function(e) {
        e.stopPropagation(); // Prevent swatch click event
        const color = $(this).text();
        navigator.clipboard.writeText(color).then(function() {
          const original = $value.text();
          $value.text('Copied!');
          setTimeout(function() { $value.text(original); }, 1000);
        }).catch(function() {
          console.warn('Failed to copy:', color);
        });
      });
    }
  });
}

function setCssColor(theme, swatchId, cssVariable, color) {
  const styleElement = document.head.querySelector(`style[data-theme="${theme}"]`) || createThemeStyle(theme);
  // Declare CSS variables scoped to both page-level theme attribute and local data-theme-mode parents
  try {
    styleElement.sheet.insertRule(
      `[data-theme="${theme}"] { ${cssVariable}: ${color}; }`,
      styleElement.sheet.cssRules.length
    );
    styleElement.sheet.insertRule(
      `[data-theme-mode="${theme}"] { ${cssVariable}: ${color}; }`,
      styleElement.sheet.cssRules.length
    );
  } catch (e) {
    // Fallback: set on root
    try { root.style.setProperty(cssVariable.replace('--', '--ui-') || cssVariable, color); } catch (err) {}
    try { root.style.setProperty(cssVariable, color); } catch (err) {}
  }
  const swatches = document.querySelectorAll(`.swatch[data-swatch-id="${swatchId}"]`);
  swatches.forEach(function(swatch) {
    const parentTheme = getThemeModeFromParent(swatch);
    if (parentTheme && parentTheme !== theme) {
      return;
    }
    swatch.setAttribute(`data-${theme}-color`, color);
  });

  // If this cssVariable looks like a button or icon background token, compute
  // an accessible foreground and write fallbacks so the UI stays accessible
  // even when browsers don't support color-contrast().
  try {
    const normalized = cssVariable.toLowerCase();
    if (normalized.includes('btn') || normalized.includes('action') || normalized.includes('accent')) {
      const fg = computeAccessibleForeground(color);
      // write to CSS custom properties scoped to theme
      writeCssVariable(theme, '--btn-contrast-fallback', fg);
      // also set icon fallback to the same or a high-contrast alternative
      writeCssVariable(theme, '--icon-contrast-fallback', fg === '#000000' ? '#111111' : '#ffffff');
    }
  } catch (e) {
    // noop; best-effort
  }

  // Ensure any buttons on the page that derive their background from dynamic
  // swatches get an enforced foreground color that meets WCAG 2 AA.
  try {
    enforceAccessibleForegrounds(theme);
  } catch (e) {}
}

// Helper: insert or update a theme-scoped CSS variable in a <style data-theme> block
function writeCssVariable(theme, varName, value) {
  const styleElement = document.head.querySelector(`style[data-theme="${theme}"]`) || createThemeStyle(theme);
  const ruleText = `[data-theme="${theme}"] { ${varName}: ${value}; }`;
  try {
    // Try to find existing rule and replace, otherwise insert
    const sheet = styleElement.sheet;
    for (let i = 0; i < sheet.cssRules.length; i++) {
      const r = sheet.cssRules[i];
      if (r.cssText && r.cssText.indexOf(varName) !== -1) {
        sheet.deleteRule(i);
        break;
      }
    }
    sheet.insertRule(ruleText, sheet.cssRules.length);
  } catch (err) {
    document.documentElement.style.setProperty(varName, value);
  }
}

// Compute accessible foreground (simple WCAG contrast: choose white or black)
function computeAccessibleForeground(bgColor) {
  try {
    const rgb = parseCssColor(bgColor);
    if (!rgb) return '#ffffff';
    const Lb = relativeLuminance(rgb.r, rgb.g, rgb.b);
    // contrast against white and black
    const contrastWhite = (1.05) / (Lb + 0.05);
    const contrastBlack = (Lb + 0.05) / 0.05;
    if (contrastWhite >= 4.5) return '#ffffff';
    if (contrastBlack >= 4.5) return '#000000';

    // Neither black nor white meets 4.5:1 — compute a grayscale foreground luminance
    // If the foreground must be lighter than background:
    const LfNeededIfLighter = 4.5 * (Lb + 0.05) - 0.05;
    // If the foreground must be darker than background:
    const LfNeededIfDarker = (Lb + 0.05) / 4.5 - 0.05;

    let Lf;
    if (LfNeededIfLighter <= 1) {
      Lf = Math.min(1, LfNeededIfLighter);
    } else {
      Lf = Math.max(0, LfNeededIfDarker);
    }

    // Convert linear luminance for gray to sRGB channel value
    const srgb = linearToSrgb(Lf);
    const hex = toHex(Math.round(srgb * 255));
    return `#${hex}${hex}${hex}`;
  } catch (e) {
    return '#ffffff';
  }
}

function linearToSrgb(c) {
  // c is linear channel 0..1
  if (c <= 0.0031308) return c * 12.92;
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function toHex(v) {
  const s = v.toString(16);
  return (s.length === 1 ? '0' + s : s).toUpperCase();
}

function relativeLuminance(r, g, b) {
  // r,g,b in 0..255
  const srgb = [r, g, b].map(v => v / 255).map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function parseCssColor(input) {
  if (!input) return null;
  input = input.trim();
  // hex
  const hex = /^#([0-9a-f]{3,8})$/i.exec(input);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16) };
    }
    if (h.length === 6 || h.length === 8) {
      return { r: parseInt(h.substring(0,2), 16), g: parseInt(h.substring(2,4), 16), b: parseInt(h.substring(4,6), 16) };
    }
  }
  // rgb(a)
  const rgb = /^rgba?\(([^)]+)\)$/.exec(input);
  if (rgb) {
    const parts = rgb[1].split(',').map(p => p.trim());
    const r = parseFloat(parts[0]);
    const g = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }
  return null;
}

// Enhance enforceAccessibleForegrounds to adjust background colors dynamically
function enforceAccessibleForegrounds(theme) {
  const selectors = ['.btn', '.blue-button', '.usa-button', '.btn-secondary', '#generateBtn', '#refineBtn', '#exportPaletteCsv', '#copyCssBtn'];
  const nodes = document.querySelectorAll(selectors.join(','));
  nodes.forEach(function(node) {
    try {
      const cs = window.getComputedStyle(node);
      let bg = cs.backgroundColor;
      let fg = cs.color;

      // Resolve transparent backgrounds
      if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') {
        let ancestor = node.parentElement;
        while (ancestor && (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)')) {
          const aCs = window.getComputedStyle(ancestor);
          bg = aCs.backgroundColor;
          ancestor = ancestor.parentElement;
        }
      }
      if (!bg) return;

      // Compute accessible foreground
      fg = computeAccessibleForeground(bg);

      // If foreground cannot meet contrast, adjust background
      const contrast = computeContrastRatio(fg, bg);
      if (contrast < 4.5) {
        bg = adjustBackgroundForContrast(bg, fg);
        node.style.backgroundColor = bg;
        fg = computeAccessibleForeground(bg);
      }

      // Apply inline styles
      node.style.color = fg;
    } catch (e) {
      // Ignore per-node errors
    }
  });
}

// Adjust background color to meet contrast requirements
function adjustBackgroundForContrast(bgColor, fgColor) {
  const rgb = parseCssColor(bgColor);
  if (!rgb) return bgColor;

  let Lb = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const Lf = relativeLuminance(...parseCssColor(fgColor));

  // Darken background if needed
  if (Lb > Lf) {
    Lb = Math.max(0, Lb - 0.1);
  } else {
    Lb = Math.min(1, Lb + 0.1);
  }

  const srgb = linearToSrgb(Lb);
  const hex = toHex(Math.round(srgb * 255));
  return `#${hex}${hex}${hex}`;
}
