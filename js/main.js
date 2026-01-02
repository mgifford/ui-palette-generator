import chroma from 'chroma-js';

import blinder from 'color-blind';
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

    const context = document.getElementById('demo');
    const options = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } };
    const results = await window.axe.run(context || document, options);
    resultsEl.textContent = `${results.violations.length} issues found`;

    const output = document.getElementById('a11yOutput');
    if (output) {
      output.innerHTML = '';
      results.violations.forEach(function(v) {
        const item = document.createElement('div');
        item.textContent = `${v.id}: ${v.help}`;
        output.appendChild(item);
      });
    }
  } catch (e) {
    resultsEl.textContent = 'Unable to run a11y check';
  }
}

addA11yPanelHandlers();

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

// Build contrast checks across core tokens for both themes
function collectContrastChecks() {
  const checks = [];
  const pairs = [
    { fg: 'neutralContentStrong', bg: 'card', label: 'Neutral text on card' },
    { fg: 'neutralContentStrong', bg: 'canvas', label: 'Neutral text on canvas' },
    { fg: 'accentContentStrong', bg: 'card', label: 'Accent text on card' },
    { fg: 'accentContentStrong', bg: 'canvas', label: 'Accent text on canvas' },
    { fg: 'accentNonContentStrong', bg: 'card', label: 'Accent strong on card' },
    { fg: 'accentNonContentStrong', bg: 'canvas', label: 'Accent strong on canvas' }
  ];

  ['light', 'dark'].forEach(function(theme) {
    pairs.forEach(function(pair) {
      const fg = getSwatchColor(theme, pair.fg);
      const bg = getSwatchColor(theme, pair.bg);
      const ratio = fg && bg ? computeContrastRatio(fg, bg) : 0;
      checks.push({ theme, fg, bg, ratio, label: pair.label, fgId: pair.fg, bgId: pair.bg });
    });
  });
  return checks;
}

function renderContrastReport(checks) {
  const body = document.getElementById('contrastReportBody');
  if (!body) return;

  const threshold = 4.5;
  const fails = checks.filter(function(c){ return c.ratio < threshold; });
  const passCount = checks.length - fails.length;

  const listItems = checks.map(function(c){
    const status = c.ratio >= threshold ? 'Pass' : 'Fail';
    const ratioText = c.ratio ? c.ratio.toFixed(2) : 'N/A';
    return `<li><strong>${c.theme}:</strong> ${c.label} — ${ratioText}:1 (${status})</li>`;
  }).join('');

  body.innerHTML = `
    <p class="input-hint">WCAG 2.2 AA target: ${threshold}:1 for text.</p>
    <p><strong>${passCount}</strong> of <strong>${checks.length}</strong> checks meet the threshold.</p>
    <ul class="contrast-report__list">${listItems}</ul>
  `;
}

function updateContrastReport() {
  const checks = collectContrastChecks();
  renderContrastReport(checks);
  refreshContrastGridWindow();
}

const contrastGridThreshold = 4.5;
const contrastGridWindowFeatures = 'width=960,height=760,scrollbars=yes,resizable=yes,location=no,status=no,menubar=no,toolbar=no';
let contrastGridWindow = null;

const colorBlindSimulators = {
  protanomaly: blinder.protanomaly,
  protanopia: blinder.protanopia,
  deuteranomaly: blinder.deuteranomaly,
  deuteranopia: blinder.deuteranopia,
  tritanomaly: blinder.tritanomaly,
  tritanopia: blinder.tritanopia,
  achromatomaly: blinder.achromatomaly,
  achromatopsia: blinder.achromatopsia,
};

const visionSimulations = [
  {
    id: 'protanomaly',
    label: 'Protanomaly',
    description: 'Reduced sensitivity to red - trouble distinguishing reds and greens',
    percent: '1.3',
    type: 'colorBlind'
  },
  {
    id: 'protanopia',
    label: 'Protanopia',
    description: 'Red blind - can’t see reds at all',
    percent: '1.5',
    type: 'colorBlind'
  },
  {
    id: 'deuteranomaly',
    label: 'Deuteranomaly',
    description: 'Reduced sensitivity to green - trouble distinguishing reds and greens',
    percent: '5.3',
    type: 'colorBlind'
  },
  {
    id: 'deuteranopia',
    label: 'Deuteranopia',
    description: 'Green blind - can’t see greens at all',
    percent: '1.2',
    type: 'colorBlind'
  },
  {
    id: 'tritanomaly',
    label: 'Tritanomaly',
    description: 'Trouble distinguishing blues and greens, and yellows and reds',
    percent: '0.02',
    type: 'colorBlind'
  },
  {
    id: 'tritanopia',
    label: 'Tritanopia',
    description: 'Unable to distinguish between blues and greens, purples and reds, and yellows and pinks',
    percent: '0.03',
    type: 'colorBlind'
  },
  {
    id: 'achromatomaly',
    label: 'Achromatomaly',
    description: 'Partial color blindness, sees the absence of most colors',
    percent: '0.09',
    type: 'colorBlind'
  },
  {
    id: 'achromatopsia',
    label: 'Achromatopsia',
    description: 'Complete color blindness, can only see shades',
    percent: '0.05',
    type: 'colorBlind'
  },
  {
    id: 'cataracts',
    label: 'Cataracts',
    description: 'Clouding of the lens in the eye that affects vision',
    percent: '33',
    type: 'filter',
    contrastModifier: -0.2
  },
  {
    id: 'glaucoma',
    label: 'Glaucoma',
    description: 'Slight vision loss',
    percent: '2',
    type: 'filter'
  },
  {
    id: 'lowvision',
    label: 'Low vision',
    description: 'Decreased and/or blurry vision (not fixable by usual means such as glasses)',
    percent: '31',
    type: 'filter',
    contrastModifier: -0.2
  },
  {
    id: 'sunlight',
    label: 'Direct sunlight',
    description: 'Simulating the effect of direct sunlight on a phone or screen',
    percent: '',
    type: 'filter',
    contrastModifier: -0.4
  },
  {
    id: 'nightshift',
    label: 'Night Shift Mode',
    description: 'Simulating the effect of night mode on a phone or screen',
    percent: '',
    type: 'filter',
    contrastModifier: -0.1
  }
];

function escapeHtml(value) {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getSimulationMetaText(simulation) {
  return simulation.percent ? `${simulation.percent}% affected` : 'Situational';
}

function simulateVisionCheck(check, simulation) {
  const baseFg = check.fg || '#000000';
  const baseBg = check.bg || '#ffffff';
  let simulatedFg = baseFg;
  let simulatedBg = baseBg;
  if (simulation.type === 'colorBlind') {
    const converter = colorBlindSimulators[simulation.id];
    if (converter) {
      try {
        simulatedFg = converter(simulatedFg);
        simulatedBg = converter(simulatedBg);
      } catch (e) {
        console.warn(`Vision simulation failed for ${simulation.id}`, e);
      }
    }
  }

  const contrast = computeContrastRatio(simulatedFg, simulatedBg) || 0;
  const modifier = Number.isFinite(simulation.contrastModifier) ? simulation.contrastModifier : 0;
  const adjusted = contrast + contrast * modifier;
  const valid = Number.isFinite(adjusted) && adjusted > 0;
  const ratioValue = valid ? adjusted : 0;
  const ratioText = valid ? ratioValue.toFixed(2) : 'N/A';
  return {
    pairFg: simulatedFg,
    pairBg: simulatedBg,
    ratioValue,
    ratioText,
    passes: valid && ratioValue >= contrastGridThreshold
  };
}

function renderVisionSimulationCell(check, simulation) {
  const result = simulateVisionCheck(check, simulation);
  const statusLabel = result.passes ? 'Pass' : 'Fail';
  const ratioLabel = result.ratioText === 'N/A' ? 'Ratio unavailable' : `${result.ratioText}:1`;
  const meta = getSimulationMetaText(simulation);
  const description = simulation.description ? `${simulation.description}. ` : '';
  const title = escapeHtml(`${simulation.label} • ${meta} • ${description}${ratioLabel}`);
  const statusText = `${statusLabel} - ${ratioLabel}`;
  return `<td class="vision-sim-cell ${simulation.id} ${statusLabel.toLowerCase()}" title="${title}">
    <div class="vision-sim-swatch" style="background:${result.pairBg};color:${result.pairFg};">${escapeHtml(statusText)}</div>
  </td>`;
}

function openContrastGridWindow(checks) {
  const previewChecks = checks || collectContrastChecks();
  if (!contrastGridWindow || contrastGridWindow.closed) {
    contrastGridWindow = window.open('', 'contrast-grid', contrastGridWindowFeatures);
  }
  if (!contrastGridWindow) return;
  renderContrastGridContent(contrastGridWindow, previewChecks);
  contrastGridWindow.focus();
}

function getReadableSwatchTextColor(color) {
  if (!color) return '#000000';
  return computeAccessibleForeground(color);
}

function renderContrastGridContent(win, checks) {
  const doc = win.document;
  doc.title = 'Contrast grid';
  ensureContrastGridStyle(doc);
  const simulationHeaders = visionSimulations.map(function(sim) {
    const meta = escapeHtml(getSimulationMetaText(sim));
    const title = escapeHtml(`${sim.label} • ${meta}`);
    return `<th class="vision-sim-header" title="${title}">${sim.label}<span class="vision-sim-header__meta">${meta}</span></th>`;
  }).join('');
  const rows = checks.map(function(c){
    const ratioText = c.ratio ? c.ratio.toFixed(2) : 'N/A';
    const ratioValue = c.ratio || 0;
    const passes = ratioValue >= contrastGridThreshold;
    const status = passes ? 'Pass' : 'Fail';
    const pairBg = c.bg || '#ffffff';
    const pairFg = c.fg || '#000000';
    const fgLabel = c.fg || 'N/A';
    const bgLabel = c.bg || 'N/A';
    const pairCell = `<td class="contrast-pair-cell" style="background:${pairBg};color:${pairFg};">
      <div class="contrast-values">${fgLabel} / ${bgLabel}</div>
    </td>`;
    const foregroundCell = c.fg ? `<td class="contrast-swatch-cell" style="background:${c.fg};color:${getReadableSwatchTextColor(c.fg)};">${fgLabel}</td>` : '<td class="contrast-empty">N/A</td>';
    const backgroundCell = c.bg ? `<td class="contrast-swatch-cell" style="background:${c.bg};color:${getReadableSwatchTextColor(c.bg)};">${bgLabel}</td>` : '<td class="contrast-empty">N/A</td>';
    const simulationCells = visionSimulations.map(function(sim) {
      return renderVisionSimulationCell(c, sim);
    }).join('');
    return `<tr class="contrast-row ${passes ? 'pass' : 'fail'}">
      <td>${c.theme}</td>
      ${pairCell}
      ${foregroundCell}
      ${backgroundCell}
      <td>${ratioText}:1</td>
      <td><span class="contrast-status">${status}</span></td>
      ${simulationCells}
    </tr>`;
  }).join('');

  doc.body.innerHTML = `
    <div class="contrast-grid">
      <h2>Contrast grid</h2>
      <p class="contrast-grid__hint">Paired contrast shows the foreground on its background. Foreground samples render the foreground glyph with the background mix, and Background swatches show the raw background color. Rows will update whenever the palette regenerates.</p>
      <div class="contrast-grid__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Theme</th>
              <th>Pair (FG/BG)</th>
              <th>Foreground</th>
              <th>Background</th>
              <th>Ratio</th>
              <th>Status</th>
              ${simulationHeaders}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="contrast-grid__note">The simulation columns, starting with PROTANOMALY, are approximations of how the palette might look for people navigating other color differences. They highlight the situations tied to the listed permanent, temporary, or situational vision differences and do not affect your WCAG compliance.</p>
      <p class="contrast-grid__credit">Simulations inspired by <a href="https://whocanuse.com/" target="_blank" rel="noopener noreferrer">WhoCanUse.com</a>.</p>
    </div>
  `;
  syncContrastGridTheme();
}

function ensureContrastGridStyle(doc) {
  if (doc.getElementById('contrast-grid-style')) return;
  const style = doc.createElement('style');
  style.id = 'contrast-grid-style';
  style.textContent = `
    :root { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    body { margin: 0; padding: 24px; background: #fdfdfd; color: #111; }
    body[data-theme='dark'] { background: #050809; color: #f2f2f2; }
    .contrast-grid { width: 100%; max-width: none; margin: 0 auto; }
    .contrast-grid__hint { color: inherit; margin-bottom: 1rem; }
    .contrast-grid__table-wrap { width: 100%; overflow-x: auto; overflow-y: hidden; margin-top: 1rem; }
    table { width: 100%; min-width: 1200px; border-collapse: collapse; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    th, td { padding: 12px; border: 1px solid rgba(0,0,0,0.08); vertical-align: top; }
    body[data-theme='dark'] th, body[data-theme='dark'] td { border-color: rgba(255,255,255,0.08); }
    th { text-align: left; background: rgba(0,0,0,0.04); }
    body[data-theme='dark'] th { background: rgba(255,255,255,0.08); }
    .contrast-pair-cell { padding: 16px 12px; min-width: 180px; border-radius: 8px; }
    .contrast-pair-cell .contrast-values { font-weight: 700; font-size: 0.85rem; letter-spacing: 0.05em; opacity: 0.85; }
    .contrast-swatch-cell { padding: 18px 12px; font-weight: 700; text-align: center; border-radius: 6px; }
    .contrast-row.pass { background: #e7ffe6; }
    .contrast-row.fail { background: #ffecec; }
    body[data-theme='dark'] .contrast-row.pass { background: rgba(0,255,128,0.08); }
    body[data-theme='dark'] .contrast-row.fail { background: rgba(255,0,0,0.1); }
    .contrast-status { font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; display: inline-flex; align-items: center; }
    .contrast-row.pass .contrast-status { background: #1d7a1d; color: #fff; }
    .contrast-row.fail .contrast-status { background: #a00; color: #fff; }
    body[data-theme='dark'] .contrast-row.pass .contrast-status { background: #2fdb5a; }
    body[data-theme='dark'] .contrast-row.fail .contrast-status { background: #ff4b4b; }
    .contrast-empty { color: rgba(0,0,0,0.5); text-align: center; font-style: italic; }
    .contrast-grid__note { font-size: 0.9rem; margin-top: 1rem; color: rgba(0,0,0,0.7); max-width: 960px; }
    body[data-theme='dark'] .contrast-grid__note { color: rgba(255,255,255,0.7); }
    .contrast-grid__credit { font-size: 0.85rem; margin-top: 0.5rem; color: rgba(0,0,0,0.65); }
    .contrast-grid__credit a { color: inherit; font-weight: 600; }
    body[data-theme='dark'] .contrast-grid__credit { color: rgba(255,255,255,0.6); }
    .vision-sim-header { text-align: center; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .vision-sim-header__meta { display: block; margin-top: 4px; font-size: 0.65rem; text-transform: none; letter-spacing: 0; color: rgba(0,0,0,0.65); }
    body[data-theme='dark'] .vision-sim-header__meta { color: rgba(255,255,255,0.6); }
    .vision-sim-cell { min-width: 140px; padding: 8px 6px; position: relative; vertical-align: top; }
    .vision-sim-swatch { position: relative; overflow: hidden; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08); min-height: 48px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; text-transform: none; letter-spacing: 0.04em; padding: 0 4px; }
    .vision-sim-swatch::before { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 1; }
    body[data-theme='dark'] .vision-sim-swatch { color: rgba(255,255,255,0.9); }
    .vision-sim-cell.pass { background: rgba(34, 153, 84, 0.08); }
    .vision-sim-cell.fail { background: rgba(210, 50, 45, 0.2); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12); }
    body[data-theme='dark'] .vision-sim-cell.fail { background: rgba(255, 179, 179, 0.15); box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.3); }
    .vision-sim-cell.cataracts .vision-sim-swatch { filter: blur(0.8px) saturate(0.5); }
    .vision-sim-cell.glaucoma .vision-sim-swatch { filter: blur(0.6px); }
    .vision-sim-cell.glaucoma .vision-sim-swatch::before { box-shadow: inset 0 0 50px 1px rgba(0, 0, 0, 0.15); background: radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 60%); }
    .vision-sim-cell.lowvision .vision-sim-swatch { filter: blur(0.6px); }
    .vision-sim-cell.lowvision .vision-sim-swatch::before { box-shadow: inset 0 0 60px 1px rgba(0, 0, 0, 0.15); }
    .vision-sim-cell.sunlight .vision-sim-swatch { filter: brightness(1.2); }
    .vision-sim-cell.sunlight .vision-sim-swatch::before { background-image: linear-gradient(-41deg, #ffffff 0%, rgba(255, 255, 255, 0.3) 15%, rgba(255, 255, 255, 0.4) 25%, rgba(255, 255, 255, 0.6) 52%, rgba(255, 255, 255, 0.4) 74%, rgba(255, 255, 255, 0.5) 88%, rgba(255, 255, 255, 0.7) 100%); }
    .vision-sim-cell.nightshift .vision-sim-swatch { filter: saturate(1.2); }
    .vision-sim-cell.nightshift .vision-sim-swatch::before { mix-blend-mode: multiply; background-color: rgba(253, 194, 66, 0.1); }
    .vision-sim-cell.lowvision .vision-sim-swatch::before,
    .vision-sim-cell.glaucoma .vision-sim-swatch::before,
    .vision-sim-cell.sunlight .vision-sim-swatch::before,
    .vision-sim-cell.nightshift .vision-sim-swatch::before { inset: 0; content: ''; position: absolute; border-radius: inherit; pointer-events: none; z-index: 1; }
  `;
  doc.head.appendChild(style);
}

function syncContrastGridTheme() {
  if (!contrastGridWindow || contrastGridWindow.closed) return;
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const doc = contrastGridWindow.document;
  try {
    doc.documentElement.setAttribute('data-theme', theme);
    doc.body.setAttribute('data-theme', theme);
  } catch (e) {}
}

function refreshContrastGridWindow() {
  if (!contrastGridWindow || contrastGridWindow.closed) return;
  const checks = collectContrastChecks();
  renderContrastGridContent(contrastGridWindow, checks);
}

function initContrastGridControls() {
  const openBtn = document.getElementById('openContrastGrid');
  const status = document.getElementById('contrastGridStatus');
  if (openBtn) {
    openBtn.disabled = false;
    openBtn.title = 'Open contrast grid';
    openBtn.addEventListener('click', function(){
      const checks = collectContrastChecks();
      openContrastGridWindow(checks);
    });
  }
  if (status) {
    status.textContent = '';
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

// Basic WCAG contrast helper (returns numeric ratio or 0 on error)
function computeContrastRatio(fg, bg) {
  try {
    return chroma.contrast(fg, bg);
  } catch (e) {
    return 0;
  }
}

// Normalize user-provided colors to uppercase hex; return null if invalid
function normalizeColorValue(value) {
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

// Ensure a color meets contrast against multiple backgrounds; returns adjusted hex
function enforceAgainstBackgrounds(hexColor, backgrounds = [], minContrast = wcagContentContrast, directionHint) {
  if (!backgrounds.length) return hexColor;
  let adjusted = hexColor;
  backgrounds.forEach(function(bg){
    adjusted = enforceContrast(adjusted, bg, minContrast, directionHint);
  });
  return adjusted;
}

// Ensure primary buttons get a foreground that meets 4.5:1 against their background
function applyButtonContrast(theme) {
  const bg = getSwatchColor(theme, 'accentNonContentStrong') || getSwatchColor(theme, 'accentContentStrong') || (theme === 'dark' ? '#2B2B2B' : '#4A4A4A');
  let fg = computeAccessibleForeground(bg);
  if (computeContrastRatio(fg, bg) < wcagContentContrast) {
    // Nudge background to meet contrast with the chosen foreground
    const direction = fg === '#000000' ? 'decrease' : 'increase';
    const fixedBg = enforceContrast(bg, fg, wcagContentContrast, direction);
    fg = computeAccessibleForeground(fixedBg);
    writeCssVariable(theme, '--btn-bg', fixedBg);
    writeCssVariable(theme, '--btn-bg-strong', fixedBg);
  } else {
    writeCssVariable(theme, '--btn-bg', bg);
    writeCssVariable(theme, '--btn-bg-strong', bg);
  }
  writeCssVariable(theme, '--btn-contrast-fallback', fg);
  writeCssVariable(theme, '--icon-contrast-fallback', fg === '#000000' ? '#111111' : '#ffffff');
}

function getHarmonyHuePlan(seedHue, mode) {
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
    const baseContentBaseline = getSwatchColor(theme, 'accentContentBaseline');

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

    const remappedContentBaseline = enforceContrast(
      rebuildColorWithHue(baseContentBaseline || baseContentStrong, huePlan.accentContentBaseline || huePlan.accentContentStrong),
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
    setCssColor(theme, 'accentContentBaseline', '--color-accentContentBaseline', remappedContentBaseline);
    setCssColor(theme, 'accentContentSubdued', '--color-accentContentSubdued', remappedContentSubdued);
  });
}

// Lookup the current color for a swatch in a given theme. Prefers the data attribute
// that setCssColor writes, and falls back to the theme-scoped CSS variable.
function getSwatchColor(theme, swatchId) {
  const swatch = document.querySelector(`.swatch[data-swatch-id="${swatchId}"][data-${theme}-color]`);
  if (swatch) {
    const val = swatch.getAttribute(`data-${theme}-color`);
    if (val) return val;
  }
  try {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(`--color-${swatchId}`);
    const trimmed = (computed || '').trim();
    if (trimmed) return trimmed;
  } catch (e) {}
  return null;
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
  lightNeutralContentStrongColor = enforceAgainstBackgrounds(lightNeutralContentStrongColor, [lightCardColor, lightCanvasColor], wcagContentContrast, 'decrease');
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

    // Establish dark mode seed color...
    // by building on light mode colors
    var darkSeedColor = setSaturation(lightSeedColor, darkModeSaturation);
    // Seed is a generator input; keep the displayed seed consistent across themes.
    setCssColor('dark', 'seed', '--color-seed', lightSeedColor.toUpperCase());

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
    // Enforce WCAG contrast for body text on dark card/canvas
    darkNeutralContentStrongColor = enforceAgainstBackgrounds(darkNeutralContentStrongColor, [darkCardColor, darkCanvasColor], wcagContentContrast, 'increase');
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

    // Reinforce button foreground contrast after palette application
    applyButtonContrast('light');
    applyButtonContrast('dark');

    // Ensure UI chrome (icons, notes) has sufficient contrast for each theme
    try { computeAndSetUiForegrounds(); } catch (e) {}

    // Reapply any saved custom overrides after generation
    try { reapplyCustomOverrides(); } catch (e) {}

    // Refresh inline contrast report with the current palette values
    try { updateContrastReport(); } catch (e) { console.info('Contrast report update failed', e); }

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
      const bg = getSwatchColor(theme, 'card') || getSwatchColor(theme, 'canvas') || (theme === 'dark' ? blackColor : whiteColor);

      const candidates = [
        getSwatchColor(theme, 'neutralContentStrong'),
        getSwatchColor(theme, 'neutralNonContentStrong'),
        getSwatchColor(theme, 'accentContentStrong'),
        blackColor,
        whiteColor
      ].filter(Boolean);

      function pickBestForeground(background) {
        let choice = null;
        let bestC = -1;
        candidates.forEach(function(c){
          const cRatio = computeContrastRatio(c, background);
          if (cRatio > bestC) { bestC = cRatio; choice = c; }
        });
        if (bestC < wcagContentContrast) {
          const cBlack = computeContrastRatio(blackColor, background);
          const cWhite = computeContrastRatio(whiteColor, background);
          if (Math.max(cBlack, cWhite) > bestC) {
            choice = cWhite >= cBlack ? whiteColor : blackColor;
            bestC = Math.max(cBlack, cWhite);
          }
        }
        return choice || (background === blackColor ? whiteColor : blackColor);
      }

      const uiFg = pickBestForeground(bg);
      const valueBg = getSwatchColor(theme, 'card') || bg;
      const valueFg = pickBestForeground(valueBg);

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

        sheet.insertRule(`[data-theme="${theme}"] { --ui-foreground: ${uiFg}; }`, sheet.cssRules.length);
        sheet.insertRule(`[data-theme-mode="${theme}"] { --ui-foreground: ${uiFg}; }`, sheet.cssRules.length);
        sheet.insertRule(`[data-theme="${theme}"] { --value-foreground: ${valueFg}; }`, sheet.cssRules.length);
        sheet.insertRule(`[data-theme-mode="${theme}"] { --value-foreground: ${valueFg}; }`, sheet.cssRules.length);
      } catch (e) {
        try { root.style.setProperty('--ui-foreground', uiFg); } catch (err) {}
        try { root.style.setProperty('--value-foreground', valueFg); } catch (err) {}
      }
    });
  }

  // Splitter handling moved to js/splitter.js
  import('./splitter.js').then(() => {/* splitter module loaded */}).catch(()=>{});

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
    try { setHashFromOverrides(); } catch (e) {}
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
  try { setHashFromOverrides(); } catch (err) {}
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

function setTransferStatus(message = '', isError = false, duration = 4000) {
  const statusEl = document.getElementById('paletteTransferStatus');
  if (!statusEl) return;
  if (statusEl._transferTimeout) {
    clearTimeout(statusEl._transferTimeout);
    statusEl._transferTimeout = null;
  }
  if (!message) {
    statusEl.textContent = '';
    statusEl.dataset.state = '';
    return;
  }
  statusEl.textContent = message;
  statusEl.dataset.state = isError ? 'error' : 'success';
  if (duration > 0) {
    statusEl._transferTimeout = setTimeout(function(){
      statusEl.textContent = '';
      statusEl.dataset.state = '';
      statusEl._transferTimeout = null;
    }, duration);
  }
}

function collectPaletteTokenRows() {
  const rows = {};
  document.querySelectorAll('.swatch').forEach(function(swatch){
    const tokenId = (swatch.dataset.swatchId || swatch.id || '').trim();
    if (!tokenId) return;
    if (!rows[tokenId]) {
      rows[tokenId] = { token: tokenId, light: '', dark: '' };
    }
    const lightColor = swatch.getAttribute('data-light-color');
    const darkColor = swatch.getAttribute('data-dark-color');
    if (lightColor) rows[tokenId].light = lightColor;
    if (darkColor) rows[tokenId].dark = darkColor;
  });
  return Object.keys(rows).map(function(key){ return rows[key]; }).filter(function(row){
    return row.light || row.dark;
  });
}

function quoteCsvValue(value = '') {
  const text = (value || '').toString().trim();
  if (/,|"|\n/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function downloadPaletteCsv() {
  const rows = collectPaletteTokenRows();
  if (!rows.length) {
    setTransferStatus('No palette tokens available to export.', true);
    return;
  }
  setTransferStatus('Preparing CSV download...');
  const header = ['token','light','dark'].map(quoteCsvValue).join(',');
  const body = rows.map(function(row){
    return [row.token, row.light, row.dark].map(quoteCsvValue).join(',');
  });
  const csvContent = [header].concat(body).join('\n');
  let url;
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const timestamp = (new Date()).toISOString().slice(0, 10);
    anchor.href = url;
    anchor.setAttribute('download', `palette-${timestamp}.csv`);
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTransferStatus(`Prepared ${rows.length} palette token${rows.length === 1 ? '' : 's'} for download.`);
  } catch (error) {
    console.error('Palette CSV download failed', error);
    setTransferStatus('Unable to prepare CSV download.', true);
  } finally {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

function parseCsvRows(csvText = '') {
  const cleaned = (csvText || '').replace(/^\uFEFF/, '');
  const rows = [];
  let curr = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (ch === '"') {
      if (inQuotes && cleaned[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      curr.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && cleaned[i + 1] === '\n') {
        i += 1;
      }
      curr.push(cell);
      rows.push(curr);
      curr = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || curr.length) {
    curr.push(cell);
    rows.push(curr);
  }
  return rows;
}

function detectColumnType(headerValue) {
  const normalized = (headerValue || '').toString().trim().toLowerCase();
  if (!normalized) return null;
  const simplified = normalized.replace(/[^a-z]/g, '');
  if (simplified === 'token' || simplified === 'tokenid' || simplified === 'swatch' || simplified === 'name' || simplified === 'id') {
    return 'token';
  }
  if (normalized.includes('token')) return 'token';
  if (normalized.includes('light') || normalized.includes('claro') || normalized.includes('day') || normalized.includes('lmode')) {
    return 'light';
  }
  if (normalized.includes('dark') || normalized.includes('night') || normalized.includes('dmode')) {
    return 'dark';
  }
  if (normalized === 'value' || normalized === 'hex' || normalized.includes('color')) {
    return 'light';
  }
  return null;
}

function normalizeTokenKey(value) {
  if (!value) return '';
  return value.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildTokenLookup() {
  const lookup = {};
  document.querySelectorAll('.swatch').forEach(function(swatch) {
    const tokenId = swatch.dataset.swatchId || swatch.getAttribute('id');
    if (!tokenId) return;
    const normalized = normalizeTokenKey(tokenId);
    if (normalized) {
      lookup[normalized] = tokenId;
    }
    lookup[tokenId.toLowerCase()] = tokenId;
  });
  return lookup;
}

function resolveTokenId(rawToken, lookup) {
  if (!rawToken) return null;
  const trimmed = rawToken.toString().trim();
  if (!trimmed) return null;
  if (lookup[trimmed]) return lookup[trimmed];
  const lower = trimmed.toLowerCase();
  if (lookup[lower]) return lookup[lower];
  const normalized = normalizeTokenKey(trimmed);
  if (lookup[normalized]) return lookup[normalized];
  return null;
}

function applyImportedPaletteCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('Import failed: CSV content is empty.');
  }
  const rows = parseCsvRows(csvText).filter(function(row) {
    return row.some(function(cell) { return (cell || '').toString().trim() !== ''; });
  });
  if (!rows.length) {
    throw new Error('Import failed: CSV file contains no data.');
  }

  const headerRow = rows[0];
  const headerTypes = headerRow.map(detectColumnType);
  const hasHeader = headerTypes.some(function(type) { return !!type; });
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const colCount = headerRow.length || 0;
  const columnIndexes = { token: null, light: null, dark: null };

  headerTypes.forEach(function(type, index) {
    if (!type || columnIndexes[type] !== null) return;
    columnIndexes[type] = index;
  });

  const fallbackOrder = ['token', 'light', 'dark'];
  for (let idx = 0; idx < Math.max(colCount, 3); idx += 1) {
    if (Object.values(columnIndexes).includes(idx)) continue;
    const nextType = fallbackOrder.find(function(type) { return columnIndexes[type] === null; });
    if (!nextType) break;
    columnIndexes[nextType] = idx;
  }

  if (columnIndexes.token === null) {
    throw new Error('Import failed: Unable to detect the token column.');
  }

  const lookup = buildTokenLookup();
  const appliedTokens = new Set();
  dataRows.forEach(function(row) {
    const rawToken = row[columnIndexes.token];
    const tokenId = resolveTokenId(rawToken, lookup);
    if (!tokenId) return;
    let touched = false;
    if (columnIndexes.light !== null) {
      const lightColor = (row[columnIndexes.light] || '').trim();
      if (lightColor && window.applyCustomColor && window.applyCustomColor('light', tokenId, lightColor)) {
        touched = true;
      }
    }
    if (columnIndexes.dark !== null) {
      const darkColor = (row[columnIndexes.dark] || '').trim();
      if (darkColor && window.applyCustomColor && window.applyCustomColor('dark', tokenId, darkColor)) {
        touched = true;
      }
    }
    if (touched) {
      appliedTokens.add(tokenId);
    }
  });

  if (!appliedTokens.size) {
    throw new Error('Import failed: The uploaded file did not contain any recognizable tokens.');
  }

  setSwatchValues('light', { scopedOnly: true });
  setSwatchValues('dark', { scopedOnly: true });
  try { updateContrastReport(); } catch (e) {}
  return appliedTokens.size;
}

// Copy CSS variables button in transfer panel
const copyCssBtn = document.getElementById('copyCssBtn');
if (copyCssBtn) {
  copyCssBtn.addEventListener('click', function(e){
    e.preventDefault();
    copyCssVariables().then(function(){
      setTransferStatus('Copied CSS variables to clipboard.');
    }).catch(function(){
      setTransferStatus('Unable to copy CSS variables.', true);
    });
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
      syncContrastGridTheme();
    });
  }
  updateThemeToggleUI();
  syncContrastGridTheme();
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
  try { setHashFromOverrides(); } catch (err) {}
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
    try { setHashFromOverrides(); } catch (err) {}
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


function ensureCustomOverrides() {
  if (window.CUSTOM_COLOR_OVERRIDES && typeof window.CUSTOM_COLOR_OVERRIDES === 'object') {
    return window.CUSTOM_COLOR_OVERRIDES;
  }
  try {
    window.CUSTOM_COLOR_OVERRIDES = JSON.parse(localStorage.getItem('customColorOverrides') || '{}');
  } catch (e) {
    window.CUSTOM_COLOR_OVERRIDES = {};
  }
  return window.CUSTOM_COLOR_OVERRIDES;
}

function persistCustomOverrides() {
  try {
    localStorage.setItem('customColorOverrides', JSON.stringify(window.CUSTOM_COLOR_OVERRIDES || {}));
  } catch (e) {}
}

function reapplyCustomOverrides() {
  const overrides = ensureCustomOverrides();
  Object.keys(overrides).forEach(function(theme) {
    const themeTokens = overrides[theme];
    if (!themeTokens || typeof themeTokens !== 'object') return;
    Object.keys(themeTokens).forEach(function(tokenId) {
      const color = themeTokens[tokenId];
      if (!color) return;
      setCssColor(theme, tokenId, `--color-${tokenId}`, color);
    });
  });
  setSwatchValues('light', { scopedOnly: true });
  setSwatchValues('dark', { scopedOnly: true });
}

function normalizeThemeName(theme) {
  const normalized = (theme || '').toString().trim().toLowerCase();
  if (normalized === 'dark') return 'dark';
  if (normalized === 'light') return 'light';
  return null;
}

window.applyCustomColor = function(theme, tokenId, color) {
  const normalizedTheme = normalizeThemeName(theme);
  const normalizedToken = (tokenId || '').toString().trim();
  const normalizedColor = normalizeColorValue(color);
  if (!normalizedTheme || !normalizedToken || !normalizedColor) {
    return false;
  }
  setCssColor(normalizedTheme, normalizedToken, `--color-${normalizedToken}`, normalizedColor);
  const overrides = ensureCustomOverrides();
  overrides[normalizedTheme] = overrides[normalizedTheme] || {};
  overrides[normalizedTheme][normalizedToken] = normalizedColor;
  persistCustomOverrides();
  try { setHashFromOverrides(); } catch (e) {}
  flashSwatches([normalizedToken]);
  try { updateContrastReport(); } catch (e) {}
  return true;
};
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
