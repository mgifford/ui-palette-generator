/**
 * Split pane resizer with drag and keyboard support
 * Persists ratio to localStorage for each split instance
 */

function initSplit(options) {
  const {
    split,        // container element
    left,         // left pane element
    gutter,       // gutter element
    right,        // right pane element
    storageKey,   // localStorage key for persistence
    minRatio = 0.15,  // minimum left pane ratio
    maxRatio = 0.85,  // maximum left pane ratio
    initialRatio = 0.5 // default ratio when nothing is saved
  } = options;

  if (!split || !left || !gutter || !right) {
    console.warn('initSplit: missing required elements', { split, left, gutter, right });
    return;
  }

  // Clamp helper to keep ratios within bounds
  const clampRatio = (r) => Math.max(minRatio, Math.min(maxRatio, r));

  let currentRatio = clampRatio(initialRatio);

  // Load saved ratio from localStorage
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const ratio = parseFloat(saved);
      if (!isNaN(ratio) && ratio >= minRatio && ratio <= maxRatio) {
        currentRatio = ratio;
      }
    }
  } catch (e) {
    console.info('Could not read localStorage for split:', storageKey);
  }

  // Apply initial ratio
  applyRatio(clampRatio(currentRatio));

  // Persist ratio to localStorage
  function persistRatio(ratio) {
    try {
      localStorage.setItem(storageKey, ratio.toFixed(4));
    } catch (e) {
      console.warn('Could not save split ratio to localStorage:', storageKey);
    }
  }

  // Apply flex ratio to panes
  function applyRatio(ratio) {
    const leftPercent = (ratio * 100).toFixed(2);
    left.style.flex = `0 0 ${leftPercent}%`;
    right.style.flex = '1 1 auto';
    currentRatio = ratio;
  }

  // Compute ratio from mouse/touch position
  function computeRatio(clientX) {
    const rect = split.getBoundingClientRect();
    const gutterRect = gutter.getBoundingClientRect();
    const gutterWidth = gutterRect.width;
    
    // Position relative to container
    let x = clientX - rect.left;
    
    // Account for gutter width
    const availableWidth = rect.width - gutterWidth;
    let ratio = x / availableWidth;
    
    // Clamp to min/max
    ratio = Math.max(minRatio, Math.min(maxRatio, ratio));
    
    return ratio;
  }

  // Pointer events (drag support)
  let isResizing = false;
  
  function onPointerDown(e) {
    if (e.button && e.button !== 0) return; // Only left mouse button
    
    isResizing = true;
    gutter.setPointerCapture(e.pointerId);
    gutter.style.background = 'linear-gradient(to right, transparent, var(--color-accentContentStrong) 40%, var(--color-accentContentStrong) 60%, transparent)';
    
    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerMove(e) {
    if (!isResizing) return;
    
    const ratio = computeRatio(e.clientX);
    applyRatio(ratio);
    persistRatio(ratio);
    
    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerUp(e) {
    if (!isResizing) return;
    
    isResizing = false;
    gutter.releasePointerCapture(e.pointerId);
    gutter.style.background = '';
    
    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerCancel(e) {
    if (!isResizing) return;
    
    isResizing = false;
    try {
      gutter.releasePointerCapture(e.pointerId);
    } catch (err) {
      // Already released
    }
    gutter.style.background = '';
  }

  // Keyboard support
  function onKeyDown(e) {
    if (e.key === 'ArrowLeft') {
      const newRatio = Math.max(minRatio, currentRatio - 0.02);
      applyRatio(newRatio);
      persistRatio(newRatio);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      const newRatio = Math.min(maxRatio, currentRatio + 0.02);
      applyRatio(newRatio);
      persistRatio(newRatio);
      e.preventDefault();
    }
  }

  // Attach event listeners
  gutter.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
  gutter.addEventListener('keydown', onKeyDown);

  // Return cleanup function
  return function cleanup() {
    gutter.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
    gutter.removeEventListener('keydown', onKeyDown);
  };
}

// Initialize all split views when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Palette light/dark split
  const paletteSplit = document.getElementById('paletteSplit');
  const paletteLeft = document.getElementById('paletteLeft');
  const paletteSplitter = document.getElementById('paletteSplitter');
  const paletteRight = document.getElementById('paletteRight');

  if (paletteSplit && paletteLeft && paletteSplitter && paletteRight) {
    initSplit({
      split: paletteSplit,
      left: paletteLeft,
      gutter: paletteSplitter,
      right: paletteRight,
      storageKey: 'uiPaletteGen:split:paletteLightDark',
      minRatio: 0.15,
      maxRatio: 0.85
    });
    console.info('[split] Palette light/dark splitter initialized');
  } else {
    console.warn('Palette split elements not found. Skipping palette split initialization.');
  }

  // Demo light/dark split
  const demoSplit = document.getElementById('demoSplit');
  const demoLeft = document.getElementById('demoLeft');
  const demoSplitter = document.getElementById('demoSplitter');
  const demoRight = document.getElementById('demoRight');

  if (demoSplit && demoLeft && demoSplitter && demoRight) {
    initSplit({
      split: demoSplit,
      left: demoLeft,
      gutter: demoSplitter,
      right: demoRight,
      storageKey: 'uiPaletteGen:split:demoLightDark',
      minRatio: 0.15,
      maxRatio: 0.85
    });
    console.info('[split] Demo light/dark splitter initialized');
  } else {
    console.warn('Demo split elements not found. Skipping demo split initialization.');
  }
});

