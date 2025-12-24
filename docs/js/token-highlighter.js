// Token highlighter: highlights demo elements that declare they use a token
(function(){
  function qsAllDemo(sel){ return Array.from(document.querySelectorAll('#demo ' + sel)); }

  function clearHighlights(){
    qsAllDemo('.token-highlight').forEach(function(el){ el.classList.remove('token-highlight','pop'); });
  }

  function highlightToken(token){
    if (!token) return;
    clearHighlights();
    var esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(token) : token;
    var selectorParts = [
      '[data-uses-token~="' + esc + '"]',
      '[data-role~="' + esc + '"]',
      '[data-token~="' + esc + '"]',
      '[data-swatch-id~="' + esc + '"]',
      '#' + esc
    ];
    var sel = selectorParts.join(', ');
    try {
      var matches = document.querySelectorAll('#demo ' + sel);
      matches.forEach(function(m){
        m.classList.add('token-highlight','pop');
        // remove 'pop' after a short time so repeated hovers retrigger
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        setTimeout(function(){ m.classList.remove('pop'); }, 500);
      });
    } catch(e){ /* ignore selector errors */ }
  }

  function onPointerOver(e){
    // support elements that carry data-token or data-swatch-id, or are .swatch
    var t = e.target.closest('[data-token],[data-swatch-id],.swatch');
    if (!t) return;
    var token = t.getAttribute('data-token') || t.getAttribute('data-swatch-id') || t.id;
    if (!token) return;
    highlightToken(token);
  }

  function onPointerOut(e){
    var related = e.relatedTarget;
    if (!related || !document.querySelector('#paletteLeft').contains(related)) clearHighlights();
  }

  function onFocusIn(e){
    var t = e.target.closest('[data-token],[data-swatch-id],.swatch');
    if (!t) return;
    var token = t.getAttribute('data-token') || t.getAttribute('data-swatch-id') || t.id;
    if (!token) return;
    highlightToken(token);
  }

  function onFocusOut(e){
    var related = e.relatedTarget;
    if (!related || !document.querySelector('#paletteLeft').contains(related)) clearHighlights();
  }

  function onKeyDown(e){
    if (e.key === 'Escape') clearHighlights();
    // Support Enter/Space to trigger highlight briefly
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.hasAttribute && (e.target.hasAttribute('data-token') || e.target.hasAttribute('data-swatch-id'))){
      e.preventDefault();
      var token = e.target.getAttribute('data-token') || e.target.getAttribute('data-swatch-id') || e.target.id;
      highlightToken(token);
      setTimeout(clearHighlights, 700);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    var palette = document.getElementById('paletteLeft');
    if (!palette) return;

    // Ensure delegation works: make swatches keyboard reachable (support data-token and data-swatch-id)
    Array.from(palette.querySelectorAll('[data-token],[data-swatch-id],.swatch')).forEach(function(sw){
      if (!sw.hasAttribute('tabindex')) sw.setAttribute('tabindex','0');
      if (!sw.hasAttribute('role')) sw.setAttribute('role','button');
      // allow Enter/Space
      sw.addEventListener('keydown', onKeyDown);
    });

    palette.addEventListener('pointerover', onPointerOver);
    palette.addEventListener('pointerout', onPointerOut);
    palette.addEventListener('focusin', onFocusIn);
    palette.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') clearHighlights(); });

    // Respect reduced motion: reduce animation effects via CSS
  });
})();
