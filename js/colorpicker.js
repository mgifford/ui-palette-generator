export function initColorPicker() {
  document.addEventListener('click', function (e) {
    const target = e.target;
    // If clicking inside an open popover, do nothing
    if (target.closest && target.closest('.color-popover')) return;

    const decorated = target.closest && target.closest('.decorated-input');
    if (decorated) {
      // Only open when clicking the mini-swatch or the text input itself
      const isMini = !!target.closest('.mini-swatch');
      // Only open on mini-swatch clicks to avoid interfering with manual typing
      if (isMini) {
        openColorPopover(decorated);
      }
      return;
    }

    // click outside: close any open popovers
    closeAllPopovers();
  });
}

function openColorPopover(container) {
  closeAllPopovers();
  const pop = document.createElement('div');
  pop.className = 'color-popover';
  pop.innerHTML = `
    <label>Enter color (CSS): <input type="text" class="color-input-text" placeholder="#336699 or rgb(10,20,30)"></label>
    <label>Color wheel: <input type="color" class="color-input-wheel"></label>
    <div class="color-popover-actions"><button class="btn btn-apply">Apply</button><button class="btn btn-cancel">Cancel</button></div>
  `;
  container.appendChild(pop);

  const text = pop.querySelector('.color-input-text');
  const wheel = pop.querySelector('.color-input-wheel');
  const mini = container.querySelector('.mini-swatch');
  const input = container.querySelector('input[type="text"]');
  // initialize with current color
  const cur = (mini && mini.style && mini.style.backgroundColor) || (input ? input.value : '');
  if (cur) {
    // if current value is a hex code, use it directly; otherwise try to convert rgb(...) to hex
    if (typeof cur === 'string' && cur.trim().startsWith('#')) {
      try { wheel.value = cur.trim(); } catch(e){}
    } else {
      try { wheel.value = rgbToHex(cur); } catch(e){}
    }
    text.value = input ? input.value : cur;
  }
  // Live preview: update mini-swatch as user types or uses wheel
  function applyPreview(val) {
    if (!val) return;
    if (mini) mini.style.backgroundColor = val;
  }
  text.addEventListener('input', function(){ applyPreview(text.value.trim() || wheel.value); });
  wheel.addEventListener('input', function(){ text.value = wheel.value; applyPreview(wheel.value); });

  pop.querySelector('.btn-apply').addEventListener('click', function() {
    const val = (text.value && text.value.trim()) || wheel.value;
    if (!val) return;
    if (input) input.value = val;
    if (mini) mini.style.backgroundColor = val;
    // trigger input change
    const ev = new Event('change', { bubbles: true });
    if (input) input.dispatchEvent(ev);
    // regenerate palette immediately
    try { window.generatePalette && window.generatePalette(); } catch (e) {}
    closeAllPopovers();
  });

  // Apply on Enter inside text input
  text.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') { ev.preventDefault(); pop.querySelector('.btn-apply').click(); } });
  pop.querySelector('.btn-cancel').addEventListener('click', function() { closeAllPopovers(); });
}

function closeAllPopovers() {
  document.querySelectorAll('.color-popover').forEach(function(p){ p.remove(); });
}

function rgbToHex(rgb) {
  // expect formats like rgb(r,g,b) or rgba(r,g,b,a)
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) throw new Error('Not rgb');
  const r = parseInt(m[1],10), g = parseInt(m[2],10), b = parseInt(m[3],10);
  return '#' + [r,g,b].map(x=> x.toString(16).padStart(2,'0')).join('');
}
