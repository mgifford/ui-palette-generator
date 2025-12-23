// Reusable split view initializer
// Usage: initSplitView({ wrapperId, leftId, rightId, splitterSelector, minPct, maxPct })
function initSplitView(opts) {
  const {
    wrapperId,
    leftId,
    rightId,
    splitterSelector = '.splitter',
    minPct = 10,
    maxPct = 90
  } = opts || {};

  const wrapper = document.getElementById(wrapperId);
  const left = document.getElementById(leftId);
  const right = document.getElementById(rightId);
  if (!wrapper || !left || !right) return null;

  let splitter = wrapper.querySelector(splitterSelector);
  if (!splitter) {
    // try by conventional id pattern
    splitter = document.getElementById((wrapperId || '') + 'Splitter');
  }
  if (!splitter) return null;

  // avoid double-init
  if (splitter.getAttribute('data-split-init') === 'true') return null;

  // ensure panes can act as containers for container queries
  left.style.boxSizing = left.style.boxSizing || '';
  right.style.boxSizing = right.style.boxSizing || '';

  const setSplit = (pct) => {
    const clamped = Math.min(Math.max(Number(pct), minPct), maxPct);
    wrapper.style.setProperty('--split', clamped + '%');
    // update legacy var too for compatibility
    wrapper.style.setProperty('--left-width', clamped + '%');
    splitter.setAttribute('aria-valuenow', String(Math.round(clamped)));
  };

  // initialize from aria or CSS var
  const ariaNow = parseFloat(splitter.getAttribute('aria-valuenow'));
  const cssNow = parseFloat(getComputedStyle(wrapper).getPropertyValue('--split')) || parseFloat(getComputedStyle(wrapper).getPropertyValue('--left-width'));
  if (!isNaN(ariaNow)) setSplit(ariaNow);
  else if (!isNaN(cssNow)) setSplit(cssNow);
  else setSplit(50);

  let dragging = false;
  let startX = 0;
  let startPct = parseFloat(splitter.getAttribute('aria-valuenow')) || 50;

  splitter.addEventListener('pointerdown', (ev) => {
    // only start for primary button when using mouse
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    dragging = true;
    startX = ev.clientX;
    startPct = parseFloat(splitter.getAttribute('aria-valuenow')) || startPct;
    try { splitter.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  });

  function onPointerMove(ev) {
    if (!dragging) return;
    const rect = wrapper.getBoundingClientRect();
    const delta = (ev.clientX - startX) / rect.width * 100;
    setSplit(startPct + delta);
  }

  function onPointerUp(ev) {
    if (!dragging) return;
    dragging = false;
    try { splitter.releasePointerCapture(ev.pointerId); } catch (e) {}
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  splitter.addEventListener('keydown', (ev) => {
    const key = ev.key;
    const step = ev.shiftKey ? 5 : 1;
    const cur = parseFloat(splitter.getAttribute('aria-valuenow')) || 50;
    if (key === 'ArrowLeft' || key === 'Left') { ev.preventDefault(); setSplit(cur - step); }
    else if (key === 'ArrowRight' || key === 'Right') { ev.preventDefault(); setSplit(cur + step); }
    else if (key === 'Home') { ev.preventDefault(); setSplit(minPct); }
    else if (key === 'End') { ev.preventDefault(); setSplit(maxPct); }
  });

  // reflect CSS var changes back to aria when style changed externally
  const mo = new MutationObserver(() => {
    const v = parseFloat(getComputedStyle(wrapper).getPropertyValue('--split')) || parseFloat(splitter.getAttribute('aria-valuenow')) || 50;
    splitter.setAttribute('aria-valuenow', String(Math.round(v)));
  });
  mo.observe(wrapper, { attributes: true, attributeFilter: ['style'] });

  splitter.setAttribute('data-split-init', 'true');

  return { setSplit };
}

document.addEventListener('DOMContentLoaded', function () {
  try {
    initSplitView({ wrapperId: 'paletteSplit', leftId: 'paletteLeft', rightId: 'paletteRight', splitterSelector: '#paletteSplitter', minPct: 10, maxPct: 90 });
    initSplitView({ wrapperId: 'demoSplit', leftId: 'demoLeft', rightId: 'demoRight', splitterSelector: '#demoSplitter', minPct: 10, maxPct: 90 });
  } catch (e) {
    console.error('splitter init failed', e);
  }
});

// expose for manual calls
window.initSplitView = initSplitView;
