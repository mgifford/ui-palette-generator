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

const wcagNonContentContrast = 3;
const wcagContentContrast = 4.5;
const root = document.documentElement;
const whiteColor = "#FFF";
const blackColor = "#000";

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

const TOKEN_LOOKUP = TOKEN_CATALOG.reduce(function(acc, token) {
  acc[token.id] = token;
  return acc;
}, {});
const CSV_HEADER = ['theme', 'color', 'token', 'role', 'category', 'usage'];

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
generatePalette();
attachPaletteTransferHandlers();
initColorPicker();

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
  generatePalette();
  e.preventDefault();
});

$('#copyBtn').on('click', function(e) {
  copyCssVariables();
  e.preventDefault();
});

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
  styleElement.sheet.insertRule(
    `[data-theme="${theme}"] { ${cssVariable}: ${color}; }`,
    styleElement.sheet.cssRules.length
  ); // Declare CSS variables in head's style element
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

  // **********
  // LIGHT MODE
  // **********

  // Establish light mode seed color
  var lightSeedColor = accentColor;
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

    setSwatchValues('light', { scopedOnly: true });
    setSwatchValues('dark', { scopedOnly: true });
    setSwatchValues($('html').attr('data-theme'));

    // Ensure UI chrome (icons, notes) has sufficient contrast for each theme
    try { computeAndSetUiForegrounds(); } catch (e) {}

  }

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

      // Write into the theme style element, replacing previous --ui-foreground rules
      try {
        const styleEl = document.head.querySelector(`style[data-theme="${theme}"]`) || createThemeStyle(theme);
        const sheet = styleEl.sheet;
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
          const rule = sheet.cssRules[i];
          try {
            if (rule && rule.cssText && rule.cssText.indexOf('--ui-foreground') !== -1) {
              sheet.deleteRule(i);
            }
          } catch (e) {}
        }
        sheet.insertRule(`[data-theme="${theme}"] { --ui-foreground: ${best}; }`, sheet.cssRules.length);
      } catch (e) {
        // If stylesheet manipulation fails, set on root as a safe fallback
        try { root.style.setProperty('--ui-foreground', best); } catch (err) {}
      }
    });
  }

  // Splitter handling moved to js/splitter.js
  import('./splitter.js').then(() => {/* splitter module loaded */}).catch(()=>{});

}
