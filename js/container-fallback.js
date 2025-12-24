// ResizeObserver fallback: toggles .is-narrow on .demo-panel when width < 480px
(function(){
  if (typeof ResizeObserver === 'undefined') return;
  try {
    var panels = document.querySelectorAll('.demo-panel');
    if (!panels.length) return;
    var ro = new ResizeObserver(function(entries){
      entries.forEach(function(entry){
        var el = entry.target;
        var width = entry.contentRect ? entry.contentRect.width : el.getBoundingClientRect().width;
        if (width < 480) el.classList.add('is-narrow'); else el.classList.remove('is-narrow');
      });
    });
    panels.forEach(function(p){ ro.observe(p); });
  } catch (e) {
    // no-op on environments that block ResizeObserver
    console.warn('container-fallback: ResizeObserver failed', e);
  }
})();
