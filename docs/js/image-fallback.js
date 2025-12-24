// Image fallback: use Robohash placeholders (cached) and generate avatar SVGs from alt text for .avatar images
(function(){
  const CACHE_VERSION = 2;
  const CACHE_KEY = 'ui_palette_avatar_cache_v' + CACHE_VERSION;

  // Clear legacy cache keys when version increments so a hard refresh will clear old data
  function clearLegacyCachesIfNeeded(){
    try {
      var seenVersion = localStorage.getItem('ui_palette_cache_version');
      if (String(seenVersion) === String(CACHE_VERSION)) return;
      // remove any old keys that match previous naming patterns
      var removes = [];
      for (var i = 0; i < localStorage.length; i++){
        var k = localStorage.key(i);
        if (!k) continue;
        if (k.indexOf('ui_palette_robo_cache') === 0 || k.indexOf('ui_palette_avatar_cache') === 0 || k.indexOf('ui_palette_robo') === 0) removes.push(k);
      }
      removes.forEach(function(k){ try { localStorage.removeItem(k); } catch(e){} });
      localStorage.setItem('ui_palette_cache_version', String(CACHE_VERSION));
    } catch(e){}
  }

  clearLegacyCachesIfNeeded();

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

  // Choose a local deterministic avatar from images/avatars based on seed string
  function hashStringToIndex(s, modulo){
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h % modulo;
  }

  const AVATAR_FEATURES = [
    // Long Hair: Frames face, starts high (y=15), goes down sides to y=90. Does not cover eyes (y~50).
    '<path d="M20 90 L 20 50 Q 20 15 50 15 Q 80 15 80 50 L 80 90 L 70 90 L 70 50 Q 70 25 50 25 Q 30 25 30 50 L 30 90 Z" fill="#333"/>',
    // Spiky Hair: Sits on top (y < 35).
    '<path d="M30 35 L 35 15 L 45 30 L 50 10 L 55 30 L 65 15 L 70 35 Q 50 25 30 35 Z" fill="#333"/>',
    // Mustache: Sits on lower face (y > 60).
    '<path d="M35 65 Q 50 55 65 65 Q 60 70 50 68 Q 40 70 35 65 Z" fill="#333"/>',
    // Glasses: Eyes are at y~50.
    '<g stroke="#333" stroke-width="3" fill="none"><circle cx="35" cy="50" r="10"/><circle cx="65" cy="50" r="10"/><line x1="45" y1="50" x2="55" y2="50"/></g>',
    // Hat: Sits on top (y < 40).
    '<path d="M15 40 L 85 40 L 85 35 L 75 35 L 75 15 L 25 15 L 25 35 L 15 35 Z" fill="#333"/>',
    // Short Hair: Sits on top (y < 40).
    '<path d="M25 40 Q 50 10 75 40 Q 80 50 80 55 L 75 55 Q 75 45 70 40 Q 50 20 30 40 Q 25 45 25 55 L 20 55 Q 20 50 25 40 Z" fill="#333"/>'
  ];

  function localAvatarForSeed(seed){
    const hue = hashStringToIndex(seed, 360);
    const featureIdx = hashStringToIndex(seed + 'feature', AVATAR_FEATURES.length);
    const feature = AVATAR_FEATURES[featureIdx];
    
    // Base body color
    const color = `hsl(${hue}, 60%, 80%)`;
    const bodyColor = `hsl(${hue}, 60%, 70%)`; // slightly darker for body

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="35" fill="${color}" />
      <path d="M15 100 Q 50 70 85 100" fill="${bodyColor}" />
      ${feature}
    </svg>`;
    
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
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
    const timer = setTimeout(function(){ if (!done) { done = true; handleLocalAvatarFallback(img, seed, size); } }, 1500);
    tester.onload = function(){ if (done) return; done = true; clearTimeout(timer); /* original loaded — nothing to do */ };
    tester.onerror = function(){ if (done) return; done = true; clearTimeout(timer); handleLocalAvatarFallback(img, seed, size); };
    try { tester.src = img.src || localAvatarForSeed(seed); } catch(e){ if (!done) { done = true; clearTimeout(timer); handleLocalAvatarFallback(img, seed, size); } }
  }

  function handleLocalAvatarFallback(img, seed, size){
    try {
      var avatarPath = localAvatarForSeed(seed);
      img.src = avatarPath;
    } catch(e){
      try { img.src = 'images/generic-female-avatar.svg'; } catch(e2){ const colors = themeColors(); img.src = avatarSvg({width: size, height: size, bg: colors.bg, fg: colors.fg, initials: 'img'}); }
    }
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
      try {
        const seed = (socialThumb.getAttribute('data-name') || 'Friendly robot');
        const avatarPath = localAvatarForSeed(seed + '::forced');
        try { socialThumb.dataset.origSrc = socialThumb.src || ''; } catch(e){}
        socialThumb.src = avatarPath;
        if (socialThumb.classList) socialThumb.classList.add('replaced-by-robo');
      } catch(e){}
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
    const mo = new MutationObserver(function(mutations){
      // keep replacing broken images
      replaceBrokenImages();
      // also re-run alert icon replacement in case alerts were injected later
      try { replaceAlertIcons(); } catch(e){}
    });
    mo.observe(document.body, { childList: true, subtree: true });
  });
})();
