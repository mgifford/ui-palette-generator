// Token highlighter: highlights demo elements that declare they use a token
(function(){
  function qsAll(sel, context){ 
      return Array.from((context || document).querySelectorAll(sel)); 
  }

  function clearHighlights(){
    qsAll('.token-highlight').forEach(function(el){ el.classList.remove('token-highlight','pop'); });
  }

  function highlightElements(elements){
    if (elements.length === 0) return;
    elements.forEach(function(m){
      m.classList.add('token-highlight','pop');
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      setTimeout(function(){ m.classList.remove('pop'); }, 500);
    });
  }

  // Highlight tokens in the demo, scoped by theme
  function highlightTokenInDemo(token, themeMode){
    if (!token) return;
    var esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(token) : token;
    
    // Determine scope: #demo-light or #demo-dark
    var demoContainerId = themeMode === 'dark' ? 'demo-dark' : 'demo-light';
    var demoContainer = document.getElementById(demoContainerId);
    if (!demoContainer) return;

    var selectorParts = [
      '[data-uses-token~="' + esc + '"]',
      '[data-role~="' + esc + '"]',
      '[data-token~="' + esc + '"]',
      '[data-swatch-id~="' + esc + '"]',
      '#' + esc
    ];
    var sel = selectorParts.join(', ');
    
    try {
      var matches = qsAll(sel, demoContainer);
      highlightElements(matches);
    } catch(e){ /* ignore selector errors */ }
  }

  // Highlight swatches in the palette, scoped by theme
  function highlightSwatches(tokens, themeMode){
    if (!tokens) return;
    var tokenList = tokens.split(/\s+/);
    var matches = [];
    
    // Determine scope: #palette-light or #palette-dark
    var paletteContainerId = themeMode === 'dark' ? 'palette-dark' : 'palette-light';
    var paletteContainer = document.getElementById(paletteContainerId);
    if (!paletteContainer) return;

    tokenList.forEach(function(token){
        if(!token) return;
        var esc = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(token) : token;
        
        // Look for data-swatch-id within the specific palette container
        var sel = '[data-swatch-id="' + esc + '"]';
        try {
            var found = qsAll(sel, paletteContainer);
            found.forEach(function(el){ matches.push(el); });
        } catch(e){}
    });
    highlightElements(matches);
  }

  function handleInteraction(target) {
    // 1. Check if target is a swatch (Swatch -> Demo)
    var swatch = target.closest('[data-swatch-id], .swatch');
    if (swatch) {
        // Determine theme of the swatch
        var palettePanel = swatch.closest('.palette-panel');
        if (!palettePanel) return;
        
        var themeMode = palettePanel.getAttribute('data-theme-mode') || 'light';
        
        var token = swatch.getAttribute('data-swatch-id') || swatch.id;
        if (token) {
            clearHighlights();
            highlightTokenInDemo(token, themeMode);
            return;
        }
    }

    // 2. Check if target is a demo element (Demo -> Swatch)
    var demoEl = target.closest('[data-uses-token]');
    if (demoEl) {
        // Determine theme of the demo element
        var demoPanel = demoEl.closest('.demo-panel');
        if (!demoPanel) return;

        var themeMode = demoPanel.getAttribute('data-theme-mode') || 'light';

        var tokens = demoEl.getAttribute('data-uses-token');
        if (tokens) {
            clearHighlights();
            highlightSwatches(tokens, themeMode);
            return;
        }
    }
  }

  function onPointerOver(e){
    handleInteraction(e.target);
  }

  function onPointerOut(e){
      var related = e.relatedTarget;
      // If we moved to something that is NOT a swatch or demo element, clear.
      if (!related) {
          clearHighlights();
          return;
      }
      
      // If related is inside the SAME interactive element, don't clear.
      var targetInteractive = e.target.closest('[data-swatch-id], .swatch, [data-uses-token]');
      var relatedInteractive = related.closest('[data-swatch-id], .swatch, [data-uses-token]');
      
      if (targetInteractive && targetInteractive === relatedInteractive) {
          return;
      }
      
      clearHighlights();
  }

  function onFocusIn(e){
    handleInteraction(e.target);
  }

  function onFocusOut(e){
    setTimeout(function(){
        var active = document.activeElement;
        if (!active || (!active.closest('[data-swatch-id], .swatch') && !active.closest('[data-uses-token]'))) {
            clearHighlights();
        }
    }, 10);
  }

  // Use event delegation
  document.addEventListener('mouseover', onPointerOver);
  document.addEventListener('mouseout', onPointerOut);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);

})();
