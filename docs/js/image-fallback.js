// Image fallback: use Robohash placeholders (cached) and generate avatar SVGs from alt text for .avatar images
(function(){
  const CACHE_KEY = 'ui_palette_robo_cache_v1';
  function getCache(){
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch(e){ return {}; }
  }
  function setCache(c){ try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch(e){} }

  function ensureCacheLimit(maxEntries){
    const cache = getCache();
    const keys = Object.keys(cache);
    if (keys.length <= maxEntries) return;
    // build array of {k, at} and sort by at (oldest first). Support legacy string entries.
    const items = keys.map(function(k){
      const v = cache[k];
      return { k: k, at: (v && v.at) ? v.at : 0 };
    }).sort(function(a,b){ return a.at - b.at; });
    while (Object.keys(cache).length > maxEntries && items.length) {
      const rem = items.shift();
      delete cache[rem.k];
    }
    setCache(cache);
  }

  function roboUrl(seed, size){
    // use robohash with set=identicon to avoid person likeness
    return `https://robohash.org/${encodeURIComponent(seed)}?set=identicon&size=${size}x${size}`;
  }

  function fetchRobohash(seed, size){
    const cache = getCache();
    const key = `${seed}|${size}`;
    try {
      const entry = cache[key];
      if (entry) {
        // support legacy string entries and new object entries
        if (typeof entry === 'string') return Promise.resolve(entry);
        if (entry.data) {
          // update access time
          entry.at = Date.now();
          cache[key] = entry;
          setCache(cache);
          return Promise.resolve(entry.data);
        }
      }
    } catch(e){}
    return fetch(roboUrl(seed, size)).then(function(resp){ return resp.blob(); }).then(function(blob){
      return new Promise(function(resolve){
        const reader = new FileReader();
        reader.onload = function(){
          // store as object with data and access time
          cache[key] = { data: reader.result, at: Date.now() };
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

    // prefer explicit data-name on the image, then on parent, then alt, then src; append theme suffix to keep light/dark different
    var seedBase = img.getAttribute('data-name') || '';
    if (!seedBase) {
      // look for a parent with data-name
      var p = img.parentElement;
      while (p && p !== document.documentElement) {
        if (p.hasAttribute && p.hasAttribute('data-name')) { seedBase = p.getAttribute('data-name'); break; }
        p = p.parentElement;
      }
    }
    if (!seedBase) seedBase = img.getAttribute('alt') || img.getAttribute('src') || 'placeholder';
    // find nearest theme mode on element or its ancestors
    var themeSuffix = '';
    var el = img;
    while (el && el !== document.documentElement) {
      var dt = el.getAttribute && (el.getAttribute('data-theme-mode') || el.getAttribute('data-theme'));
      if (dt) { themeSuffix = dt; break; }
      el = el.parentNode;
    }
    const seed = themeSuffix ? (seedBase + '::' + themeSuffix) : seedBase;
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
      if (dataUrl) { img.src = dataUrl; return; }
      // fallback to a repository generic female avatar SVG if available
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'images/generic-female-avatar.svg', true);
        xhr.onload = function(){ if (xhr.status >= 200 && xhr.status < 400) { img.src = 'images/generic-female-avatar.svg'; } else {
            const colors = themeColors(); img.src = avatarSvg({width: size, height: size, bg: colors.bg, fg: colors.fg, initials: 'img'});
        }};
        xhr.onerror = function(){ const colors = themeColors(); img.src = avatarSvg({width: size, height: size, bg: colors.bg, fg: colors.fg, initials: 'img'}); };
        xhr.send();
      } catch(e){ const colors = themeColors(); img.src = avatarSvg({width: size, height: size, bg: colors.bg, fg: colors.fg, initials: 'img'}); }
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
    // Force replace known social thumbnail(s) and other demo images for consistent placeholders
    const forcedSelectors = [
      '.hidden-social-media-thumbnail',
      'img[src*="social_media_thumbnail"]',
      'img[alt*="social media" i]',
      'img[alt*="social" i]',
      'img[src*="thumbnail"]',
      'img[src*="avatar"]',
      'img[src*="profile"]',
      'img[data-force-robo]'
    ];
    const forced = document.querySelectorAll(forcedSelectors.join(','));
    forced.forEach(function(socialThumb){
      if (!socialThumb) return;
      if (socialThumb.classList && socialThumb.classList.contains('replaced-by-robo')) return;
      // create a robo image labelled 'Friendly robot'
      const size = Math.max(parseInt(socialThumb.getAttribute('width')||320,10), parseInt(socialThumb.getAttribute('height')||180,10), 128);
      fetchRobohash('Friendly robot', size).then(function(dataUrl){
        if (dataUrl) {
          try { socialThumb.dataset.origSrc = socialThumb.src || ''; } catch(e){}
          socialThumb.src = dataUrl;
          if (socialThumb.classList) socialThumb.classList.add('replaced-by-robo');
          // bump cache access time if stored in the structured meta format
          try {
            const cache = getCache();
            const key = 'Friendly robot|' + size;
            const entry = cache[key];
            if (entry && typeof entry === 'object') {
              entry.at = Date.now();
              cache[key] = entry;
              setCache(cache);
            }
          } catch(e){}
        }
      }).catch(function(){});
    });
    // enforce cache limit
    ensureCacheLimit(50);
  }

  document.addEventListener('DOMContentLoaded', function(){
    // generate per-theme random robot seeds so light/dark use different avatars
    var randomSeeds = { light: null, dark: null };
    function makeSeed(prefix){ return prefix + '::' + Math.random().toString(36).slice(2,8); }
    // pre-scan and assign randomized seeds for elements using the Random Robot marker
    Array.from(document.querySelectorAll('[data-force-robo]')).forEach(function(el){
      var dn = el.getAttribute('data-name') || '';
      if (dn.indexOf('Random Robot::') === 0) {
        // determine theme suffix in attribute (Random Robot::light or ::dark)
        var parts = dn.split('::');
        var theme = parts[1] || 'light';
        if (!randomSeeds[theme]) randomSeeds[theme] = makeSeed('RandomRobot-' + theme);
        el.setAttribute('data-name', randomSeeds[theme]);
      }
    });
    replaceBrokenImages();
    // Ensure alert icons render even if the Material Symbols font isn't available
    function replaceAlertIcons(){
      document.querySelectorAll('.alert .material-symbols-rounded').forEach(function(el){
        try{
          var txt = (el.textContent || '').trim().toLowerCase();
          if (!txt) return;
          var svg = '';
          if (txt === 'info') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='1.25rem' height='1.25rem' aria-hidden='true' focusable='false'><circle cx='12' cy='12' r='10' fill='none' stroke='currentColor' stroke-width='1.5'/><rect x='11' y='10' width='2' height='5' fill='currentColor'/><circle cx='12' cy='7' r='1' fill='currentColor'/></svg>";
          } else if (txt === 'warning' || txt === 'error') {
            svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='1.25rem' height='1.25rem' aria-hidden='true' focusable='false'><path fill='currentColor' d='M1 21h22L12 2 1 21z'/><rect x='11' y='10' width='2' height='5' fill='white'/><rect x='11' y='16' width='2' height='2' fill='white'/></svg>";
          }
          if (svg) {
            el.innerHTML = svg;
            el.setAttribute('role','img');
            el.setAttribute('aria-label', txt);
          }
        }catch(e){}
      });
    }
    replaceAlertIcons();
    const mo = new MutationObserver(function(){ replaceBrokenImages(); });
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
