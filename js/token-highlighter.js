// Token highlighter: highlights demo elements that declare they use a token
(function(){
  function qsAllDemo(sel){ return Array.from(document.querySelectorAll('#demo ' + sel)); }

  function clearHighlights(){
    qsAllDemo('.token-highlight').forEach(function(el){ el.classList.remove('token-highlight','pop'); });
  }

  function highlightToken(token, swatchColor){
    if (!token) return;
    clearHighlights();
    
    // 1. Highlight by attribute (existing logic)
    var esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(token) : token;
    var selectorParts = [
      '[data-uses-token~="' + esc + '"]',
      '[data-role~="' + esc + '"]',
      '[data-token~="' + esc + '"]',
      '[data-swatch-id~="' + esc + '"]',
      '#' + esc
    ];
    var sel = selectorParts.join(', ');
    var matches = [];
    try {
      matches = Array.from(document.querySelectorAll('#demo ' + sel));
    } catch(e){ /* ignore selector errors */ }

    // 2. Highlight by computed style (new logic)
    // Only if we have a swatchColor to compare against
    if (swatchColor) {
      // Iterate all elements in demo. This is heavy but okay for a demo.
      var allDemoEls = document.querySelectorAll('#demo *');
      allDemoEls.forEach(function(el){
        var style = getComputedStyle(el);
        // Check common properties
        if (style.backgroundColor === swatchColor || 
            style.color === swatchColor || 
            style.borderColor === swatchColor || 
            style.outlineColor === swatchColor) {
          if (!matches.includes(el)) {
            matches.push(el);
          }
        }
      });
    }

    matches.forEach(function(m){
      m.classList.add('token-highlight','pop');
      // remove 'pop' after a short time so repeated hovers retrigger
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setTimeout(function(){ m.classList.remove('pop'); }, 500);
    });
  }

  function onPointerOver(e){
    // support elements that carry data-token or data-swatch-id, or are .swatch
    var t = e.target.closest('[data-token],[data-swatch-id],.swatch');
    if (!t) return;
    var token = t.getAttribute('data-token') || t.getAttribute('data-swatch-id') || t.id;
    if (!token) return;
    
    // Get computed color of the swatch if possible
    var swatchColor = null;
    // If t is the swatch or inside it
    var swatchEl = t.classList.contains('swatch') ? t : t.closest('.swatch');
    if (swatchEl) {
        // The color is usually on the .color child, or the swatch itself?
        // In index.html: <div class="swatch"><span class="color"></span></div>
        // The .color span has the background color.
        var colorSpan = swatchEl.querySelector('.color');
        if (colorSpan) {
            swatchColor = getComputedStyle(colorSpan).backgroundColor;
        } else {
            swatchColor = getComputedStyle(swatchEl).backgroundColor;
        }
    }

    highlightToken(token, swatchColor);
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
    
    var swatchColor = null;
    var swatchEl = t.classList.contains('swatch') ? t : t.closest('.swatch');
    if (swatchEl) {
        var colorSpan = swatchEl.querySelector('.color');
        if (colorSpan) {
            swatchColor = getComputedStyle(colorSpan).backgroundColor;
        } else {
            swatchColor = getComputedStyle(swatchEl).backgroundColor;
        }
    }
    
    highlightToken(token, swatchColor);
  }

  function onFocusOut(e){
    clearHighlights();
  }

  // Use event delegation
  document.addEventListener('mouseover', onPointerOver);
  document.addEventListener('mouseout', onPointerOut);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);

})();
