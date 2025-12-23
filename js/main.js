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
const CSV_HEADER = ['theme', 'token', 'role', 'category', 'usage', 'color'];

// Insert the random color value into the text field
function generateRandomColor() {
  var randomColor = chroma.random().hex().toUpperCase();
  $('#accentColor').val(randomColor);
  $('#accentColor').parent().find('.mini-swatch').css('background-color', randomColor);
}

initializeScopedIds();
generateRandomColor();
generatePalette();
attachPaletteTransferHandlers();

$('#generateBtn').on('click', function(e) {
  generatePalette();
  e.preventDefault();
});

$('#copyBtn').on('click', function(e) {
  copyCssVariables();
  e.preventDefault();
});

$('#lightModeBtn').on('click', function(e) {
  $('html').attr('data-theme', 'light');
  $(this).attr('data-state', 'on');
  $('#darkModeBtn').attr('data-state', 'off');
  setSwatchValues('light');
  e.preventDefault();
});
$('#darkModeBtn').on('click', function(e) {
  $('html').attr('data-theme', 'dark');
  $(this).attr('data-state', 'on');
  $('#lightModeBtn').attr('data-state', 'off');
  setSwatchValues('dark');
  e.preventDefault();
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
  var color = $(this).val();
  $('#accentColor').parent().find('.mini-swatch').css('background-color', color);
})

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
  const swatch = document.querySelector(`.swatch[data-swatch-id="${swatchId}"]`);
  if (!swatch) return '';
  return swatch.getAttribute(`data-${theme}-color`) || '';
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
      rows.push([
        theme,
        token.id,
        token.label,
        token.category,
        token.usage,
        color
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
  if (!candidate.startsWith('#')) {
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

  }

  // Reusable split-resizer
  function makeSplitResizable(splitEl, leftEl, splitterEl, rightEl, options = {}) {
    const min = options.min || 10;
    const max = options.max || 90;
    const step = options.step || 2;
    const largeStep = options.largeStep || 10;
    const rootStyle = splitEl.style;

    function clamp(v){ return Math.min(Math.max(v, min), max); }
    function setLeftPercent(p){ p = Math.round(clamp(p)); rootStyle.setProperty('--left-width', p + '%'); splitterEl.setAttribute('aria-valuenow', String(p)); }

    // initialize
    (function init(){ const attr = splitterEl.getAttribute('aria-valuenow'); const n = parseInt(attr, 10); setLeftPercent(isNaN(n)?50:n); })();

    // pointer handling (Pointer Events)
    let dragging = false, startX = 0, startLeft = 50;
    splitterEl.addEventListener('pointerdown', function(ev){ if(ev.pointerType==='mouse' && ev.button!==0) return; dragging = true; splitterEl.setPointerCapture(ev.pointerId); startX = ev.clientX; startLeft = parseFloat(splitterEl.getAttribute('aria-valuenow')) || 50; ev.preventDefault(); });
    window.addEventListener('pointermove', function(ev){ if(!dragging) return; const rect = splitEl.getBoundingClientRect(); const delta = ev.clientX - startX; const percentDelta = (delta / rect.width) * 100; setLeftPercent(startLeft + percentDelta); });
    window.addEventListener('pointerup', function(ev){ if(!dragging) return; dragging = false; try{ splitterEl.releasePointerCapture(ev.pointerId); }catch(e){} });

    // keyboard
    splitterEl.addEventListener('keydown', function(ev){ const key = ev.key; const shift = ev.shiftKey; const s = shift?largeStep:step; let cur = parseInt(splitterEl.getAttribute('aria-valuenow'),10) || 50; if(key === 'ArrowLeft' || key === 'Left'){ ev.preventDefault(); setLeftPercent(cur - s); } else if(key === 'ArrowRight' || key === 'Right'){ ev.preventDefault(); setLeftPercent(cur + s); } else if(key === 'Home'){ ev.preventDefault(); setLeftPercent(min); } else if(key === 'End'){ ev.preventDefault(); setLeftPercent(max); } });

    // update left width from CSS variable on changes (keeps splitter aria in sync)
    const mo = new MutationObserver(function(){ const left = parseFloat(getComputedStyle(splitEl).getPropertyValue('--left-width')) || 50; splitterEl.setAttribute('aria-valuenow', String(Math.round(left))); });
    mo.observe(splitEl, { attributes: true, attributeFilter: ['style'] });

    return { setLeftPercent };
  }

  // Instantiate for palette and demo (if present)
  document.addEventListener('DOMContentLoaded', function(){
    const paletteSplit = document.getElementById('paletteSplit');
    if (paletteSplit) {
      const left = document.getElementById('paletteLeft');
      const right = document.getElementById('paletteRight');
      const splitter = document.getElementById('paletteSplitter');
      if (left && right && splitter) makeSplitResizable(paletteSplit, left, splitter, right);
    }
    const demoSplit = document.getElementById('demoSplit');
    if (demoSplit) {
      const left = document.getElementById('demoLeft');
      const right = document.getElementById('demoRight');
      const splitter = document.getElementById('demoSplitter');
      if (left && right && splitter) makeSplitResizable(demoSplit, left, splitter, right);
    }
  });

}
