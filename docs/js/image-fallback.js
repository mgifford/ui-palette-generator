// Image fallback: use Robohash placeholders (cached) and generate avatar SVGs from alt text for .avatar images
(function(){
  const CACHE_KEY = 'ui_palette_robo_cache_v1';
  function getCache(){
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch(e){ return {}; }
  }
  function setCache(c){ try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch(e){} }

  function roboUrl(seed, size){
    // use robohash with set=identicon to avoid person likeness
    return `https://robohash.org/${encodeURIComponent(seed)}?set=identicon&size=${size}x${size}`;
  }

  function fetchRobohash(seed, size){
    const cache = getCache();
    const key = `${seed}|${size}`;
    if (cache[key]) return Promise.resolve(cache[key]);
    return fetch(roboUrl(seed, size)).then(function(resp){ return resp.blob(); }).then(function(blob){
      return new Promise(function(resolve){
        const reader = new FileReader();
        reader.onload = function(){
          cache[key] = reader.result;
          setCache(cache);
          resolve(reader.result);
        };
        reader.readAsDataURL(blob);
      });
    }).catch(function(){ return null; });
  }

  function initialsFromAlt(alt){
    if (!alt) return '';
    const parts = alt.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }

  function avatarSvg({width=64,height=64,bg='#CCC',fg='#222',initials=''}){
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}' role='img' aria-label='avatar'><rect width='100%' height='100%' fill='${bg}' rx='${Math.min(width,height)/8}'/><text x='50%' y='50%' dy='.35em' font-family='Segoe UI, Roboto, Helvetica, Arial, sans-serif' font-size='${Math.floor(height/2.5)}' text-anchor='middle' fill='${fg}'>${initials}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function themeColors(){
    const root = document.documentElement;
    const bg = getComputedStyle(root).getPropertyValue('--color-accentNonContentSoft') || '#ddd';
    const fg = getComputedStyle(root).getPropertyValue('--color-neutralContentStrong') || '#333';
    return { bg: bg.trim(), fg: fg.trim() };
  }

  function handleImage(img){
    // avoid re-handling
    if (img.dataset.fallbackHandled) return;
    img.dataset.fallbackHandled = '1';
    if (img.classList.contains('avatar')) {
      const initials = initialsFromAlt(img.getAttribute('alt') || '');
      const colors = themeColors();
      const w = img.getAttribute('width') || 64;
      const h = img.getAttribute('height') || 64;
      img.src = avatarSvg({width: w, height: h, bg: colors.bg, fg: colors.fg, initials: initials || 'A'});
      return;
    }

    const seed = img.getAttribute('alt') || img.getAttribute('data-name') || img.getAttribute('src') || 'placeholder';
    const size = Math.max(parseInt(img.getAttribute('width')||64,10), parseInt(img.getAttribute('height')||64,10), 64);

    // Test the URL quickly; if not loadable within timeout, replace
    const tester = new Image();
    let done = false;
    const timer = setTimeout(function(){ if (!done) { done = true; handleRobohashFallback(img, seed, size); } }, 1500);
    tester.onload = function(){ if (done) return; done = true; clearTimeout(timer); /* original loaded — nothing to do */ };
    tester.onerror = function(){ if (done) return; done = true; clearTimeout(timer); handleRobohashFallback(img, seed, size); };
    try { tester.src = img.src || roboUrl(seed, size); } catch(e){ if (!done) { done = true; clearTimeout(timer); handleRobohashFallback(img, seed, size); } }
  }

  function handleRobohashFallback(img, seed, size){
    fetchRobohash(seed, size).then(function(dataUrl){
      if (dataUrl) img.src = dataUrl;
      else {
        const colors = themeColors();
        img.src = avatarSvg({width: size, height: size, bg: colors.bg, fg: colors.fg, initials: 'img'});
      }
    });
  }

  function replaceBrokenImages(){
    const imgs = document.querySelectorAll('img');
    imgs.forEach(function(img){
      // skip if image already resolved
      if (img.complete && img.naturalWidth > 0) return;
      // otherwise handle
      try { handleImage(img); } catch(e){}
      img.addEventListener('error', function(){ try { handleImage(img); } catch(e){} });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    replaceBrokenImages();
    const mo = new MutationObserver(function(){ replaceBrokenImages(); });
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
