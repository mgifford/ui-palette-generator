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

// Insert the random color value into the text field
function generateRandomColor() {
  var randomColor = chroma.random().hex().toUpperCase();
  $('#accentColor').val(randomColor);
  $('#accentColor').parent().find('.mini-swatch').css('background-color', randomColor);
}

// expose generatePalette globally for small modules to call
window.generatePalette = generatePalette;

initializeScopedIds();
generateRandomColor();
// Parse any color overrides from the URL hash before generating
function parseHashToOverrides() {
  try {
    const raw = (location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    // Split top-level comma-separated pairs (e.g. "colors=light.seed=AA00AA,light.card=FFF,accent=red")
    const pairs = raw.split(',').map(s=>s.trim()).filter(Boolean);
    const obj = {};
    pairs.forEach(function(pair){
      const kv = pair.split('=');
      if (kv.length < 2) return;
      const key = decodeURIComponent(kv[0]);
      const rest = kv.slice(1).join('=');
      // If this is the accent shorthand, handle separately
      if (key.toLowerCase() === 'accent') {
        const rawAccent = decodeURIComponent(rest || '').trim();
        if (rawAccent) {
          // store raw accent for later serialization
          window.LAST_RAW_ACCENT = rawAccent;
          // If the accent input exists in the DOM, set it now (normalize will happen in change handler)
          try {
            const accInput = document.getElementById('accentColor');
            if (accInput) {
              accInput.value = rawAccent;
              // trigger change so the normalizer runs
              accInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch(e){}
        }
        return;
      }

      if (key.toLowerCase() === 'harmony') {
        const mode = decodeURIComponent(rest || '').trim();
        if (mode) {
          setHarmonyMode(mode, { syncUi: false, persist: false });
        }
        return;
      }

      // Otherwise treat as colors entries like theme.token=HEX or token=HEX
      const left = key;
      const hex = '#' + rest.replace(/^#/, '').toUpperCase();
      const parts = left.split('.'); // theme.token or token
      if (parts.length === 2) {
        const theme = parts[0];
        const token = parts[1];
        obj[theme] = obj[theme] || {};
        obj[theme][token] = hex;
      } else if (parts.length === 1) {
        obj.light = obj.light || {};
        obj.light[parts[0]] = hex;
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

function setHashFromOverrides() {
  try {
    const obj = window.CUSTOM_COLOR_OVERRIDES || JSON.parse(localStorage.getItem('customColorOverrides') || '{}');
    const parts = [];
    Object.keys(obj).forEach(function(theme){
      const tokens = obj[theme] || {};
      Object.keys(tokens).forEach(function(token){
        const hex = (tokens[token] || '').replace(/^#/, '').toUpperCase();
        if (!hex) return;
        parts.push(`${encodeURIComponent(theme)}.${encodeURIComponent(token)}=${hex}`);
      });
    });
    // include accent shorthand if available
    try {
      const rawAccent = window.LAST_RAW_ACCENT || (document.getElementById('accentColor') && document.getElementById('accentColor').value) || '';
      if (rawAccent) {
        // prefer the raw value (named color) if provided, otherwise the hex without '#'
        const accentValue = (window.LAST_RAW_ACCENT || rawAccent).toString().replace(/^#/, '');
        parts.push(`accent=${encodeURIComponent(accentValue)}`);
      }
    } catch(e) {}
    try {
      const harmonyMode = getHarmonyMode();
      if (harmonyMode && harmonyMode !== HARMONY_DEFAULT) {
        parts.push(`harmony=${encodeURIComponent(harmonyMode)}`);
      }
    } catch (e) {}
    if (parts.length) {
      location.hash = `colors=${parts.join(',')}`;
    } else {
      history.replaceState(null, '', location.pathname + location.search);
    }
  } catch (e) {}
}

parseHashToOverrides();
restoreHarmonyModeFromStorage();
generatePalette();
attachPaletteTransferHandlers();
initColorPicker();
// Load USWDS colors for snapping
uswds.loadUswds().then(()=>{ window.uswds = uswds; }).catch(()=>{});

// Initialize theme from saved preference or prefers-color-scheme
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
});

$('#randomColorBtn').on('click', function(e) {
  generateRandomColor();
  e.preventDefault();
});

$('#tryBrandColor a').on('click', function(e) {
  var brandColor = $(this).attr('data-color-value');
  $('#accentColor').val(brandColor);
  $('#accentColor').parent().find('.mini-swatch').css('background-color', brandColor);
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
}

function getSwatchColor(theme, swatchId) {
  const swatches = Array.from(document.querySelectorAll(`.swatch[data-swatch-id="${swatchId}"]`));
  if (!swatches.length) return '';
  // Prefer the swatch that is scoped to the requested theme parent
  for (let i = 0; i < swatches.length; i += 1) {
    const s = swatches[i];
    const parentTheme = getThemeModeFromParent(s);
    if (parentTheme === theme) {
      return s.getAttribute(`data-${theme}-color`) || '';
    }
  }
  // Fallback to the first match's attribute
  return swatches[0].getAttribute(`data-${theme}-color`) || '';
}

function downloadPaletteCsv() {
  const csv = buildPaletteCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ui-palette-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setTransferStatus('Palette exported as CSV.');
}

function buildPaletteCsv() {
  const rows = [CSV_HEADER.map(csvEscape).join(',')];
  ['light', 'dark'].forEach(function(theme) {
    TOKEN_CATALOG.forEach(function(token) {
      const color = getSwatchColor(theme, token.id) || '';
      if (!color) {
        return; // Skip rows without a color value
      }
      // CSV_HEADER is: theme, color, token, role, category, usage
      rows.push([
        theme,
        color,
        token.id,
        token.label,
        token.category,
        token.usage
      ].map(csvEscape).join(','));
    });
  });
  return rows.join('\n');
}

function csvEscape(value) {
  const text = (value || '').toString();
  const needsQuotes = /[",\n]/.test(text);
  const escaped = text.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function applyImportedPaletteCsv(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error('The CSV file was empty.');
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    throw new Error('No rows found in the CSV file.');
  }
  const headerCells = splitCsvLine(lines.shift());
  const columnMap = {};
  headerCells.forEach(function(cell, index) {
    columnMap[cell.trim().toLowerCase()] = index;
  });
  if (columnMap.theme === undefined || columnMap.token === undefined || columnMap.color === undefined) {
    throw new Error('CSV must include theme, token, and color columns.');
  }

  let applied = 0;
  lines.forEach(function(line) {
    const cells = splitCsvLine(line);
    const theme = (cells[columnMap.theme] || '').trim().toLowerCase();
    if (theme !== 'light' && theme !== 'dark') {
      return;
    }
    const tokenId = (cells[columnMap.token] || '').trim();
    const normalizedColor = normalizeColorValue(cells[columnMap.color]);
    if (!tokenId || !normalizedColor) {
      return;
    }
    const meta = TOKEN_LOOKUP[tokenId];
    if (!meta) {
      return;
    }
    setCssColor(theme, meta.id, meta.cssVar, normalizedColor);
    applied += 1;
  });

  if (applied) {
    setSwatchValues('light', { scopedOnly: true });
    setSwatchValues('dark', { scopedOnly: true });
    setSwatchValues($('html').attr('data-theme'));
    // Recompute UI chrome foregrounds to keep contrast after an import
    try { computeAndSetUiForegrounds(); } catch (e) {}
  }

  return applied;
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function normalizeColorValue(value) {
  if (!value) {
    return null;
  }
  let candidate = value.trim();
  if (!candidate) {
    return null;
  }
  // If the user entered a plain hex string like "ff00aa" (no #),
  // prefix it with '#'. Do not prefix named colors (e.g. 'red') or
  // functional notations like 'rgb(...)'.
  if (!candidate.startsWith('#') && /^[0-9A-Fa-f]{3,8}$/.test(candidate)) {
    candidate = `#${candidate}`;
  }
  try {
    return chroma(candidate).hex().toUpperCase();
  } catch (err) {
    return null;
  }
}

// Allow other modules (colorpicker) to apply a custom color to a specific token and theme.
window.applyCustomColor = function(theme, tokenId, color) {
  try {
    const normalized = normalizeColorValue(color);
    if (!normalized) return false;
    const meta = TOKEN_LOOKUP[tokenId];
    if (!meta) return false;
    setCssColor(theme, meta.id, meta.cssVar, normalized);
    // persist override so it survives regenerations
    window.CUSTOM_COLOR_OVERRIDES = window.CUSTOM_COLOR_OVERRIDES || {};
    window.CUSTOM_COLOR_OVERRIDES[theme] = window.CUSTOM_COLOR_OVERRIDES[theme] || {};
    window.CUSTOM_COLOR_OVERRIDES[theme][meta.id] = normalized;
    try { localStorage.setItem('customColorOverrides', JSON.stringify(window.CUSTOM_COLOR_OVERRIDES)); } catch (e) {}
    try { setHashFromOverrides(); } catch (e) {}
    // update visible labels for scoped swatches and active theme
    setSwatchValues('light', { scopedOnly: true });
    setSwatchValues('dark', { scopedOnly: true });
    setSwatchValues($('html').attr('data-theme'));
    try { computeAndSetUiForegrounds(); } catch (e) {}
    return true;
  } catch (e) { return false; }
};

function reapplyCustomOverrides() {
  try {
    const raw = localStorage.getItem('customColorOverrides');
    if (!raw) return;
    const obj = JSON.parse(raw);
    window.CUSTOM_COLOR_OVERRIDES = obj;
    Object.keys(obj).forEach(function(theme) {
      const tokens = obj[theme] || {};
      Object.keys(tokens).forEach(function(tokenId) {
        const meta = TOKEN_LOOKUP[tokenId];
        if (meta) {
          try { setCssColor(theme, meta.id, meta.cssVar, tokens[tokenId]); } catch (e) {}
        }
      });
    });
    // update visible swatches
    setSwatchValues('light', { scopedOnly: true });
    setSwatchValues('dark', { scopedOnly: true });
    setSwatchValues($('html').attr('data-theme'));
  } catch (e) {}
}

function setTransferStatus(message, isError = false) {
  const statusEl = document.getElementById('paletteTransferStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.state = isError ? 'error' : 'idle';
}

// Create theme in head's style element
function createThemeStyle(theme) {
  const style = document.createElement('style');
  style.setAttribute('data-theme', theme);
  document.head.appendChild(style);
  return style;
}

// Clear colors from css rule which are added in setCssColor.
// This will prevent older values from getting copied.
function clearCssColors(theme) {
  const styleElement = document.head.querySelector(`style[data-theme="${theme}"]`);
  if (!styleElement) return;

  const { sheet } = styleElement;
  while (sheet.cssRules.length) {
    sheet.deleteRule(0);
  }
}

function generatePalette() {
  clearCssColors('light');
  clearCssColors('dark');

  const accentColor = $('#accentColor').val().trim();
  const canvasContrast = $('#canvasContrast').val().trim();
  const cardContrast = $('#cardContrast').val().trim();
  const softContrast = $('#softContrast').val().trim();
  const strongContrast = $('#strongContrast').val().trim();
  const neutralSaturation = $('#neutralSaturation').val().trim();
  const neutralContrast = $('#neutralContrast').val().trim();
  const darkModeSaturation = $('#darkModeSaturation').val().trim();

  const softContrastValue = parseFloat(softContrast) || 1.1;
  const strongContrastValue = parseFloat(strongContrast) || 1.7;

  // **********
  // LIGHT MODE
  // **********

  // Establish light mode seed color
  var lightSeedColor = accentColor;
  // Remember the raw accent that the user entered so we can include it in the URL hash
  try { window.LAST_RAW_ACCENT = accentColor; } catch(e) {}
  setCssColor('light', 'seed', '--color-seed', lightSeedColor.toUpperCase());

  // Establish light mode background colors
  var lightCanvasColor = adjustLuminanceToContrast(lightSeedColor, whiteColor, canvasContrast);
  setCssColor('light', 'canvas', '--color-canvas', lightCanvasColor);
  var lightCardColor = adjustLuminanceToContrast(lightSeedColor, whiteColor, cardContrast);
  setCssColor('light', 'card', '--color-card', lightCardColor);

  // Establish light mode accent baseline colors
  var lightAccentNonContentBaselineColor = adjustLuminanceToContrast(lightSeedColor, lightCardColor, wcagNonContentContrast);
  setCssColor('light', 'accentNonContentBaseline', '--color-accentNonContentBaseline', lightAccentNonContentBaselineColor);
  var lightAccentContentBaselineColor = adjustLuminanceToContrast(lightSeedColor, lightCardColor, wcagContentContrast);
  setCssColor('light', 'accentContentBaseline', '--color-accentContentBaseline', lightAccentContentBaselineColor);

  // Establish light mode accent non-content colors
  var lightAccentNonContentStrongColor = adjustLuminanceToContrast(lightAccentNonContentBaselineColor, lightAccentNonContentBaselineColor, strongContrast, "decrease");
  setCssColor('light', 'accentNonContentStrong', '--color-accentNonContentStrong', lightAccentNonContentStrongColor);
  var lightAccentNonContentSubduedColor = decreaseOpacityToContrast(lightAccentNonContentStrongColor, lightCardColor, wcagNonContentContrast);
  setCssColor('light', 'accentNonContentSubdued', '--color-accentNonContentSubdued', lightAccentNonContentSubduedColor);
  var lightAccentNonContentSoftColor = decreaseOpacityToContrast(lightAccentNonContentStrongColor, lightCardColor, softContrast);
  setCssColor('light', 'accentNonContentSoft', '--color-accentNonContentSoft', lightAccentNonContentSoftColor);

  // Establish light mode accent content colors
  var lightAccentContentStrongColor = adjustLuminanceToContrast(lightAccentContentBaselineColor, lightAccentContentBaselineColor, strongContrast, "decrease");
  setCssColor('light', 'accentContentStrong', '--color-accentContentStrong', lightAccentContentStrongColor);
  var lightAccentContentSubduedColor = decreaseOpacityToContrast(lightAccentContentStrongColor, lightCardColor, wcagContentContrast);
  setCssColor('light', 'accentContentSubdued', '--color-accentContentSubdued', lightAccentContentSubduedColor);

  // Establish light mode neutral content colors
  var lightDesaturatedNeutralContentStrongColor = setSaturation(lightAccentContentStrongColor, neutralSaturation);
  var lightNeutralContentStrongColor = adjustLuminanceToContrast(lightDesaturatedNeutralContentStrongColor, blackColor, neutralContrast);
  setCssColor('light', 'neutralContentStrong', '--color-neutralContentStrong', lightNeutralContentStrongColor);
  var lightNeutralContentSubduedColor = decreaseOpacityToContrast(lightNeutralContentStrongColor, lightCardColor, wcagContentContrast);
  setCssColor('light', 'neutralContentSubdued', '--color-neutralContentSubdued', lightNeutralContentSubduedColor);

  // Establish light mode neutral non-content colors
  // Calculate the luminance difference between strong accent colors...
  // and apply the relative difference to the strong neutral content color...
  // to establish the strong neutral non-content color
  var lightAccentContentStrongColorLuminance = chroma(lightAccentContentStrongColor).luminance();
  var lightAccentNonContentStrongColorLuminance = chroma(lightAccentNonContentStrongColor).luminance();
  var lightNeutralContentStrongColorLuminance = chroma(lightNeutralContentStrongColor).luminance();
  var lightNeutralStrongAccentLuminance = lightAccentNonContentStrongColorLuminance / lightAccentContentStrongColorLuminance * lightNeutralContentStrongColorLuminance;
  var lightNeutralNonContentStrongColor = chroma(lightNeutralContentStrongColor).luminance(lightNeutralStrongAccentLuminance).hex();
  setCssColor('light', 'neutralNonContentStrong', '--color-neutralNonContentStrong', lightNeutralNonContentStrongColor);
  var lightNeutralNonContentSubduedColor = decreaseOpacityToContrast(lightNeutralNonContentStrongColor, lightCardColor, wcagNonContentContrast);
  setCssColor('light', 'neutralNonContentSubdued', '--color-neutralNonContentSubdued', lightNeutralNonContentSubduedColor);
  var lightNeutralNonContentSoftColor = decreaseOpacityToContrast(lightNeutralNonContentStrongColor, lightCardColor, softContrast);
  setCssColor('light', 'neutralNonContentSoft', '--color-neutralNonContentSoft', lightNeutralNonContentSoftColor);

  // *********
  // DARK MODE
  // *********

  let createDarkMode = true;

  if (createDarkMode) {

    // Set UI style for dark mode
    // $("html").attr("data-theme", "dark");
    // $("body").css("background", "#000");
    // $(".swatch .value").css("background", "#000");
    // $("#canvas .card").css("box-shadow", "inset 0 0 0 1px var(--color-neutralNonContentSoft)");

    // Establish dark mode seed color...
    // by building on light mode colors
    var darkSeedColor = setSaturation(lightSeedColor, darkModeSaturation);
    setCssColor('dark', 'seed', '--color-seed', darkSeedColor);

    // Establish dark mode background colors...
    // By building on lightNeutralContentStrongColor
    var darkCanvasColor = lightNeutralContentStrongColor;
    setCssColor('dark', 'canvas', '--color-canvas', darkCanvasColor);
    var darkCardColor = adjustLuminanceToContrast(darkCanvasColor, darkCanvasColor, canvasContrast, "increase");
    setCssColor('dark', 'card', '--color-card', darkCardColor);

    // Establish dark mode accent baseline colors
    var darkAccentNonContentBaselineColor = adjustLuminanceToContrast(darkSeedColor, darkCardColor, wcagNonContentContrast);
    setCssColor('dark', 'accentNonContentBaseline', '--color-accentNonContentBaseline', darkAccentNonContentBaselineColor);
    var darkAccentContentBaselineColor = adjustLuminanceToContrast(darkSeedColor, darkCardColor, wcagContentContrast);
    setCssColor('dark', 'accentContentBaseline', '--color-accentContentBaseline', darkAccentContentBaselineColor);

    // // Establish dark mode accent non-content colors
    var darkAccentNonContentStrongColor = adjustLuminanceToContrast(darkAccentNonContentBaselineColor, darkAccentNonContentBaselineColor, strongContrast, "increase");
    setCssColor('dark', 'accentNonContentStrong', '--color-accentNonContentStrong', darkAccentNonContentStrongColor);
    var darkAccentNonContentSubduedColor = decreaseOpacityToContrast(darkAccentNonContentStrongColor, darkCardColor, wcagNonContentContrast);
    // console.log(darkAccentNonContentSubduedColor);
    setCssColor('dark', 'accentNonContentSubdued', '--color-accentNonContentSubdued', darkAccentNonContentSubduedColor);
    var darkAccentNonContentSoftColor = decreaseOpacityToContrast(darkAccentNonContentStrongColor, darkCardColor, softContrast);
    setCssColor('dark', 'accentNonContentSoft', '--color-accentNonContentSoft', darkAccentNonContentSoftColor);

    // Establish dark mode accent content colors
    var darkAccentContentStrongColor = adjustLuminanceToContrast(darkAccentContentBaselineColor, darkAccentContentBaselineColor, strongContrast, "increase");
    setCssColor('dark', 'accentContentStrong', '--color-accentContentStrong', darkAccentContentStrongColor);
    var darkAccentContentSubduedColor = decreaseOpacityToContrast(darkAccentContentStrongColor, darkCardColor, wcagContentContrast);
    setCssColor('dark', 'accentContentSubdued', '--color-accentContentSubdued', darkAccentContentSubduedColor);

    // Establish dark mode neutral content colors
    var darkDesaturatedNeutralContentStrongColor = setSaturation(darkAccentContentStrongColor, neutralSaturation);
    var darkNeutralContentStrongColor = adjustLuminanceToContrast(darkDesaturatedNeutralContentStrongColor, whiteColor, neutralContrast);
    setCssColor('dark', 'neutralContentStrong', '--color-neutralContentStrong', darkNeutralContentStrongColor);
    var darkNeutralContentSubduedColor = decreaseOpacityToContrast(darkNeutralContentStrongColor, darkCardColor, wcagContentContrast);
    setCssColor('dark', 'neutralContentSubdued', '--color-neutralContentSubdued', darkNeutralContentSubduedColor);

    // Establish dark mode neutral non-content colors
    // Calculate the luminance difference between strong accent colors...
    // and apply the relative difference to the strong neutral content color...
    // to establish the strong neutral non-content color
    var darkAccentContentStrongColorLuminance = chroma(darkAccentContentStrongColor).luminance();
    var darkAccentNonContentStrongColorLuminance = chroma(darkAccentNonContentStrongColor).luminance();
    var darkNeutralContentStrongColorLuminance = chroma(darkNeutralContentStrongColor).luminance();
    var darkNeutralStrongAccentLuminance = darkAccentNonContentStrongColorLuminance / darkAccentContentStrongColorLuminance * darkNeutralContentStrongColorLuminance;
    var darkNeutralNonContentStrongColor = chroma(darkNeutralContentStrongColor).luminance(darkNeutralStrongAccentLuminance).hex();
    setCssColor('dark', 'neutralNonContentStrong', '--color-neutralNonContentStrong', darkNeutralNonContentStrongColor);
    var darkNeutralNonContentSubduedColor = decreaseOpacityToContrast(darkNeutralNonContentStrongColor, darkCardColor, wcagNonContentContrast);
    setCssColor('dark', 'neutralNonContentSubdued', '--color-neutralNonContentSubdued', darkNeutralNonContentSubduedColor);
    var darkNeutralNonContentSoftColor = decreaseOpacityToContrast(darkNeutralNonContentStrongColor, darkCardColor, softContrast);
    setCssColor('dark', 'neutralNonContentSoft', '--color-neutralNonContentSoft', darkNeutralNonContentSoftColor);

    // Apply deterministic harmony overlay to accent tokens (light + dark)
    applyHarmonyLayer(getHarmonyMode(), {
      nonContentContrast: wcagNonContentContrast,
      softContrast: softContrastValue,
      strongContrast: strongContrastValue,
      contentContrast: wcagContentContrast
    });

    setSwatchValues('light', { scopedOnly: true });
    setSwatchValues('dark', { scopedOnly: true });
    setSwatchValues($('html').attr('data-theme'));

    // Ensure UI chrome (icons, notes) has sufficient contrast for each theme
    try { computeAndSetUiForegrounds(); } catch (e) {}

    // Reapply any saved custom overrides after generation
    try { reapplyCustomOverrides(); } catch (e) {}

  }

    // Map semantic tokens so demo UI can surface them (light + dark)
    try {
      // Light theme mappings
      setCssColor('light', 'primary', '--color-primary', lightAccentContentStrongColor || lightAccentContentBaselineColor || lightAccentNonContentStrongColor);
      setCssColor('light', 'secondary', '--color-secondary', lightNeutralContentStrongColor || lightNeutralNonContentStrongColor);
      setCssColor('light', 'accent', '--color-accent', lightAccentContentBaselineColor || lightAccentNonContentBaselineColor);
      setCssColor('light', 'background', '--color-background', lightCanvasColor || lightCardColor);
      setCssColor('light', 'surface', '--color-surface', lightCardColor || lightCanvasColor);
      // semantic states (use accent shades or contrast mixes)
      setCssColor('light', 'error', '--color-error', '#D32F2F');
      setCssColor('light', 'warning', '--color-warning', '#FBC02D');
      setCssColor('light', 'info', '--color-info', '#1976D2');
      setCssColor('light', 'success', '--color-success', '#388E3C');

      // Dark theme mappings (derive sensible counterparts)
      setCssColor('dark', 'primary', '--color-primary', darkAccentContentStrongColor || darkAccentContentBaselineColor || darkAccentNonContentStrongColor);
      setCssColor('dark', 'secondary', '--color-secondary', darkNeutralContentStrongColor || darkNeutralNonContentStrongColor);
      setCssColor('dark', 'accent', '--color-accent', darkAccentContentBaselineColor || darkAccentNonContentBaselineColor);
      setCssColor('dark', 'background', '--color-background', darkCanvasColor || darkCardColor);
      setCssColor('dark', 'surface', '--color-surface', darkCardColor || darkCanvasColor);
      setCssColor('dark', 'error', '--color-error', '#EF5350');
      setCssColor('dark', 'warning', '--color-warning', '#FDD835');
      setCssColor('dark', 'info', '--color-info', '#64B5F6');
      setCssColor('dark', 'success', '--color-success', '#66BB6A');
    } catch (e) {}

  // Compute and set a suitable --ui-foreground for each theme so UI chrome
  // (icons, small text in notes, etc.) meets an acceptable contrast ratio.
  function computeAndSetUiForegrounds() {
    ['light', 'dark'].forEach(function(theme) {
      // Prefer card background for computing contrast, fallback to canvas
      const bg = getSwatchColor(theme, 'card') || getSwatchColor(theme, 'canvas') || (theme === 'dark' ? blackColor : whiteColor);

      const candidates = [
        getSwatchColor(theme, 'neutralContentStrong'),
        getSwatchColor(theme, 'neutralNonContentStrong'),
        getSwatchColor(theme, 'accentContentStrong'),
        blackColor,
        whiteColor
      ].filter(Boolean);

      let best = null;
      let bestContrast = -1;
      candidates.forEach(function(c) {
        try {
          const contrast = chroma.contrast(c, bg);
          if (contrast > bestContrast) {
            bestContrast = contrast;
            best = c;
          }
        } catch (e) {}
      });

      // If none meet the content contrast target, try mixing towards black/white
      if (bestContrast < wcagContentContrast && best) {
        const targets = [blackColor, whiteColor];
        targets.forEach(function(target) {
          if (bestContrast >= wcagContentContrast) return;
          for (let p = 0.1; p <= 1.0; p += 0.1) {
            try {
              const mixed = chroma.mix(best, target, p, 'rgb').hex();
              const contrast = chroma.contrast(mixed, bg);
              if (contrast > bestContrast) {
                bestContrast = contrast;
                best = mixed;
              }
              if (bestContrast >= wcagContentContrast) break;
            } catch (e) {}
          }
        });
      }

      if (!best) {
        // fallback to the higher-contrast of black/white
        best = chroma.contrast(blackColor, bg) >= chroma.contrast(whiteColor, bg) ? blackColor : whiteColor;
      }

      // Write into the theme style element, replacing previous --ui-foreground
      // and --value-foreground rules. Also compute a conservative --value-foreground
      // that has sufficient contrast against the card background.
      try {
        const styleEl = document.head.querySelector(`style[data-theme="${theme}"]`) || createThemeStyle(theme);
        const sheet = styleEl.sheet;
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
          const rule = sheet.cssRules[i];
          try {
            if (rule && rule.cssText && (rule.cssText.indexOf('--ui-foreground') !== -1 || rule.cssText.indexOf('--value-foreground') !== -1)) {
              sheet.deleteRule(i);
            }
          } catch (e) {}
        }

        // Insert --ui-foreground
        sheet.insertRule(`[data-theme="${theme}"] { --ui-foreground: ${best}; }`, sheet.cssRules.length);
        sheet.insertRule(`[data-theme-mode="${theme}"] { --ui-foreground: ${best}; }`, sheet.cssRules.length);

        // Compute a value foreground targeted at the card background
        const cardBg = getSwatchColor(theme, 'card') || bg;
        const valueCandidates = [
          getSwatchColor(theme, 'neutralContentStrong'),
          getSwatchColor(theme, 'accentContentStrong'),
          getSwatchColor(theme, 'neutralNonContentStrong'),
          blackColor,
          whiteColor
        ].filter(Boolean);
        let bestVal = null;
        let bestValContrast = -1;
        valueCandidates.forEach(function(c) {
          try {
            const contrast = chroma.contrast(c, cardBg);
            if (contrast > bestValContrast) {
              bestValContrast = contrast;
              bestVal = c;
            }
          } catch (e) {}
        });
        if (bestValContrast < wcagContentContrast && bestVal) {
          const targets = [blackColor, whiteColor];
          targets.forEach(function(target) {
            if (bestValContrast >= wcagContentContrast) return;
            for (let p = 0.1; p <= 1.0; p += 0.1) {
              try {
                const mixed = chroma.mix(bestVal, target, p, 'rgb').hex();
                const contrast = chroma.contrast(mixed, cardBg);
                if (contrast > bestValContrast) {
                  bestValContrast = contrast;
                  bestVal = mixed;
                }
                if (bestValContrast >= wcagContentContrast) break;
              } catch (e) {}
            }
          });
        }
        if (!bestVal) {
          bestVal = chroma.contrast(blackColor, cardBg) >= chroma.contrast(whiteColor, cardBg) ? blackColor : whiteColor;
        }

        sheet.insertRule(`[data-theme="${theme}"] { --value-foreground: ${bestVal}; }`, sheet.cssRules.length);
        sheet.insertRule(`[data-theme-mode="${theme}"] { --value-foreground: ${bestVal}; }`, sheet.cssRules.length);
      } catch (e) {
        try { root.style.setProperty('--ui-foreground', best); } catch (err) {}
        try { root.style.setProperty('--value-foreground', best); } catch (err) {}
      }
    });
  }

  // Splitter handling moved to js/splitter.js
  import('./splitter.js').then(() => {/* splitter module loaded */}).catch(()=>{});

}
