// Token highlighter: highlights demo elements that declare they use a token
(function(){
  function qsAllDemo(sel){ return Array.from(document.querySelectorAll('#demo ' + sel)); }

  function clearHighlights(){
    qsAllDemo('.token-highlight').forEach(function(el){ el.classList.remove('token-highlight'); });
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
      matches.forEach(function(m){ m.classList.add('token-highlight'); });
    } catch(e){ /* ignore selector errors */ }
  }

  function onPointerOver(e){
    var t = e.target.closest('[data-token]');
    if (!t) return;
    var token = t.getAttribute('data-token');
    highlightToken(token);
  }

  function onPointerOut(e){
    // when leaving the palette area, clear
    var related = e.relatedTarget;
    if (!related || !document.querySelector('#paletteLeft').contains(related)) clearHighlights();
  }

  function onFocusIn(e){
    var t = e.target.closest('[data-token]');
    if (!t) return;
    var token = t.getAttribute('data-token');
    highlightToken(token);
  }

  function onFocusOut(e){
    var related = e.relatedTarget;
    if (!related || !document.querySelector('#paletteLeft').contains(related)) clearHighlights();
  }

  function onKeyDown(e){
    if (e.key === 'Escape') clearHighlights();
    // Support Enter/Space to trigger highlight briefly
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.hasAttribute && e.target.hasAttribute('data-token')){
      e.preventDefault();
      var token = e.target.getAttribute('data-token');
      highlightToken(token);
      setTimeout(clearHighlights, 700);
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    var palette = document.getElementById('paletteLeft');
    if (!palette) return;

    // Ensure delegation works: make token-bearing swatches keyboard reachable
    Array.from(palette.querySelectorAll('[data-token]')).forEach(function(sw){
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
