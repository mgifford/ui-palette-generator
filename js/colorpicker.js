export function initColorPicker() {
  document.addEventListener('click', function (e) {
    const target = e.target;
    // Open when clicking the mini-swatch or input within .decorated-input
    if (target.closest && target.closest('.decorated-input')) {
      const container = target.closest('.decorated-input');
      openColorPopover(container);
    } else {
      // click outside: close any open popovers
      closeAllPopovers();
    }
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
  const cur = mini && mini.style && mini.style.backgroundColor ? mini.style.backgroundColor : (input ? input.value : '');
  if (cur) {
    try { wheel.value = rgbToHex(cur); } catch(e){}
    text.value = input ? input.value : cur;
  }

  pop.querySelector('.btn-apply').addEventListener('click', function() {
    const val = text.value.trim() || wheel.value;
    if (!val) return;
    if (input) input.value = val;
    if (mini) mini.style.backgroundColor = val;
    // trigger input change
    const ev = new Event('change', { bubbles: true });
    if (input) input.dispatchEvent(ev);
    closeAllPopovers();
  });
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
