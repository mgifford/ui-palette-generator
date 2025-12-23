// Simple image fallback: generate small SVG placeholders for failed images
(function(){
  function createSvgPlaceholder({width=64,height=64, bg='#EEE', fg='#666', text='img'}){
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}' role='img' aria-label='placeholder image'><rect width='100%' height='100%' fill='${bg}'/><g fill='${fg}' font-family='Segoe UI, Roboto, Helvetica, Arial, sans-serif' font-size='12' text-anchor='middle'><text x='50%' y='50%' dy='.35em'>${text}</text></g></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function themeColors() {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') || 'light';
    const bg = getComputedStyle(root).getPropertyValue('--color-canvas') || (theme === 'dark' ? '#111' : '#fff');
    const fg = getComputedStyle(root).getPropertyValue('--color-neutralContentSubdued') || (theme === 'dark' ? '#ddd' : '#444');
    return { bg: bg.trim(), fg: fg.trim() };
  }

  function replaceBrokenImages() {
    const imgs = document.querySelectorAll('img');
    imgs.forEach(function(img){
      if (!img.complete || img.naturalWidth === 0) {
        const colors = themeColors();
        const w = img.getAttribute('width') || 64;
        const h = img.getAttribute('height') || 64;
        img.src = createSvgPlaceholder({width: w, height: h, bg: colors.bg, fg: colors.fg, text: 'img'});
      }
      img.addEventListener('error', function(){
        const colors = themeColors();
        const w = img.getAttribute('width') || 64;
        const h = img.getAttribute('height') || 64;
        img.src = createSvgPlaceholder({width: w, height: h, bg: colors.bg, fg: colors.fg, text: 'img'});
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    replaceBrokenImages();
    // watch for new images added later
    const mo = new MutationObserver(function(){ replaceBrokenImages(); });
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
