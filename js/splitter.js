// Resizer module: provides a reusable splitter and instantiates splits on DOMContentLoaded
export function makeSplitResizable(splitEl, leftEl, splitterEl, rightEl, options = {}) {
  const min = options.min || 10;
  const max = options.max || 90;
  const step = options.step || 2;
  const largeStep = options.largeStep || 10;
  const rootStyle = splitEl.style;

  function clamp(v){ return Math.min(Math.max(v, min), max); }
  function setLeftPercent(p){ p = Math.round(clamp(p)); rootStyle.setProperty('--left-width', p + '%'); splitterEl.setAttribute('aria-valuenow', String(p)); }

  // initialize
  (function init(){ const attr = splitterEl.getAttribute('aria-valuenow'); const n = parseInt(attr, 10); setLeftPercent(isNaN(n)?50:n); })();

  // pointer handling
  let dragging = false, startX = 0, startLeft = 50;
  splitterEl.addEventListener('pointerdown', function(ev){
    // debug: log pointerdown to help diagnose blocked pointer events
    console.debug('splitter pointerdown', { pointerType: ev.pointerType, button: ev.button });
    if(ev.pointerType==='mouse' && ev.button!==0) return;
    dragging = true;
    try { splitterEl.setPointerCapture(ev.pointerId); } catch(e) { /* ignore capture errors */ }
    startX = ev.clientX;
    startLeft = parseFloat(splitterEl.getAttribute('aria-valuenow')) || 50;
    ev.preventDefault();
  });
  window.addEventListener('pointermove', function(ev){
    if(!dragging) return;
    // debug: log pointermove occasionally to indicate activity
    if (Math.random() < 0.02) console.debug('splitter pointermove', { clientX: ev.clientX });
    const rect = splitEl.getBoundingClientRect();
    const delta = ev.clientX - startX;
    const percentDelta = (delta / rect.width) * 100;
    setLeftPercent(startLeft + percentDelta);
  });
  window.addEventListener('pointerup', function(ev){ if(!dragging) return; dragging = false; try{ splitterEl.releasePointerCapture(ev.pointerId); }catch(e){} });

  // keyboard
  splitterEl.addEventListener('keydown', function(ev){ const key = ev.key; const shift = ev.shiftKey; const s = shift?largeStep:step; let cur = parseInt(splitterEl.getAttribute('aria-valuenow'),10) || 50; if(key === 'ArrowLeft' || key === 'Left'){ ev.preventDefault(); setLeftPercent(cur - s); } else if(key === 'ArrowRight' || key === 'Right'){ ev.preventDefault(); setLeftPercent(cur + s); } else if(key === 'Home'){ ev.preventDefault(); setLeftPercent(min); } else if(key === 'End'){ ev.preventDefault(); setLeftPercent(max); } });

  // keep aria-valuenow in sync if style var changes externally
  const mo = new MutationObserver(function(){ const left = parseFloat(getComputedStyle(splitEl).getPropertyValue('--left-width')) || 50; splitterEl.setAttribute('aria-valuenow', String(Math.round(left))); });
  mo.observe(splitEl, { attributes: true, attributeFilter: ['style'] });

  return { setLeftPercent };
}

// Auto-initialize known splits
document.addEventListener('DOMContentLoaded', function(){
  const paletteSplit = document.getElementById('paletteSplit');
  if (paletteSplit) {
    const left = document.getElementById('paletteLeft');
    const right = document.getElementById('paletteRight');
    const splitter = document.getElementById('paletteSplitter');
    if (left && right && splitter) {
      console.debug('Initializing palette splitter', { paletteSplit, left, right, splitter });
      // ensure the splitter is on top of nearby content for pointer interactions
      try { splitter.style.zIndex = '100'; } catch(e){}
      splitter.setAttribute('data-split-init', 'true');
      makeSplitResizable(paletteSplit, left, splitter, right);
    }
  }
  const demoSplit = document.getElementById('demoSplit');
  if (demoSplit) {
    const left = document.getElementById('demoLeft');
    const right = document.getElementById('demoRight');
    const splitter = document.getElementById('demoSplitter');
    if (left && right && splitter) {
      console.debug('Initializing demo splitter', { demoSplit, left, right, splitter });
      try { splitter.style.zIndex = '100'; } catch(e){}
      splitter.setAttribute('data-split-init', 'true');
      makeSplitResizable(demoSplit, left, splitter, right);
    }
  }
});
