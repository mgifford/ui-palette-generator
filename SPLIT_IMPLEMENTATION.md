# Split Resizer Implementation

## Overview

The UI Palette Generator now includes a working **drag-to-resize split pane** between the Palette (left) and Demo (right) sections. The split supports:

- **Mouse drag** to resize live
- **Keyboard** arrow keys (ArrowLeft/ArrowRight) to adjust in 2% increments
- **Persistent storage** via localStorage (survives page reload)
- **Accessibility** with role="separator", aria-orientation="vertical", and full keyboard support

## Architecture

### HTML Structure

The main split container wraps the Palette and Demo sections:

```html
<main>
  <div class="app-split" id="appSplit">
    
    <!-- Left pane: Palette -->
    <section id="palette" class="app-pane" id="panePalette">
      <!-- existing palette content -->
    </section>
    
    <!-- Draggable gutter -->
    <div class="app-gutter" id="appGutter" 
         role="separator" 
         aria-orientation="vertical" 
         aria-label="Resize palette and demo" 
         tabindex="0"></div>
    
    <!-- Right pane: Demo -->
    <section id="demo" class="app-pane" id="paneDemo">
      <!-- existing demo content -->
    </section>
    
  </div><!-- .app-split -->
</main>
```

### CSS (in `_sass/_style.scss`)

```scss
/* Split container - flex layout */
.app-split {
  display: flex;
  width: 100%;
  gap: 0;
}

/* Panes - shrinkable with min-width: 0 (CRITICAL!) */
.app-pane {
  flex: 1 1 0;
  min-width: 0;  /* ← Allows panes to shrink below content size */
  overflow: auto;
}

/* Gutter - fixed width, draggable, visual feedback */
.app-gutter {
  flex: 0 0 12px;
  width: 12px;
  cursor: col-resize;
  pointer-events: auto;
  z-index: 10;
  background: linear-gradient(...);  /* Visible indicator */
  
  &:hover, &:focus {
    background: linear-gradient(...);  /* Darker on interaction */
  }
}
```

### JavaScript (in `js/splitter.js`)

The main `initSplit()` function:

1. **Loads** saved ratio from localStorage
2. **Applies** ratio to panes as flex basis percentages
3. **Handles** pointer events (drag) with capture and bounds clamping
4. **Handles** keyboard events (arrow keys)
5. **Persists** ratio to localStorage on each change
6. **Provides** cleanup function for re-initialization

Key parameters:
- `minRatio`: 0.2 (20% minimum for left pane)
- `maxRatio`: 0.8 (80% maximum for left pane)
- `storageKey`: localStorage key for persistence

## Usage

The split is automatically initialized on DOMContentLoaded:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const appSplit = document.getElementById('appSplit');
  const panePalette = document.getElementById('panePalette');
  const appGutter = document.getElementById('appGutter');
  const paneDemo = document.getElementById('paneDemo');

  if (appSplit && panePalette && appGutter && paneDemo) {
    initSplit({
      split: appSplit,
      left: panePalette,
      gutter: appGutter,
      right: paneDemo,
      storageKey: 'uiPaletteGen:split:paletteVsDemo',
      minRatio: 0.2,
      maxRatio: 0.8
    });
  }
});
```

## Debugging Checklist

### If resizing "does nothing":

1. **Check HTML structure** - Verify elements exist:
   ```javascript
   console.log(document.getElementById('appSplit'));
   console.log(document.getElementById('panePalette'));
   console.log(document.getElementById('appGutter'));
   console.log(document.getElementById('paneDemo'));
   ```

2. **Check CSS** - Verify computed styles:
   ```javascript
   const split = document.getElementById('appSplit');
   const palette = document.getElementById('panePalette');
   console.log('Split display:', getComputedStyle(split).display);  // Should be "flex"
   console.log('Palette min-width:', getComputedStyle(palette).minWidth);  // Should be "0"
   ```

3. **Check gutter hit-test**:
   - Hover gutter → cursor should change to `col-resize`
   - Click gutter in DevTools Elements panel → should highlight
   - Verify: `pointer-events: auto` and `width: 12px`

4. **Check event firing**:
   ```javascript
   document.getElementById('appGutter').addEventListener('pointerdown', 
     () => console.log('[DEBUG] gutter pointerdown fired'));
   ```

5. **Check ratio application**:
   - Drag gutter
   - In DevTools, inspect palette element
   - Its `style.flex` should update in real-time
   - If it doesn't update, check JavaScript errors in console

6. **Check DOM not being replaced**:
   - If `generatePalette()` rebuilds the DOM, the gutter listeners may be on old nodes
   - Solution: Re-run `initSplit()` after DOM rebuild (or ensure palette/demo sections are not recreated)

## Common Issues

### Issue: Gutter is not draggable

**Cause**: Missing `min-width: 0` on `.app-pane`

**Fix**: Ensure both panes have `min-width: 0` in CSS

### Issue: Layout "flickers" or looks "stuck" during drag

**Cause**: JavaScript is computing ratio incorrectly or flex is not applied

**Fix**: 
1. Check `console.log()` in `onPointerMove` to see if ratio is computed
2. Verify `left.style.flex` is being set
3. Check parent containers for `overflow: hidden` or fixed widths

### Issue: Ratio not persisting after reload

**Cause**: localStorage key mismatch or localStorage blocked

**Fix**:
1. Check: `localStorage.getItem('uiPaletteGen:split:paletteVsDemo')`
2. Verify localStorage is not disabled
3. Check browser console for localStorage errors

### Issue: Gutter not visible or not focusable

**Cause**: Width is 0, z-index is too low, or visibility is hidden

**Fix**:
1. Verify `.app-gutter` has `width: 12px`
2. Verify `z-index: 10` is sufficient
3. Check for `display: none` or `visibility: hidden`

## Files Modified

- `docs/index.html`: Added `.app-split` wrapper, `.app-pane` classes, `#appGutter` element
- `_sass/_style.scss`: Added `.app-split`, `.app-pane`, `.app-gutter` CSS
- `js/splitter.js`: Replaced with new `initSplit()` implementation
- `docs/index.html`: Added `<script defer src="js/splitter.js"></script>`

## Testing

### Manual Testing Checklist

- [ ] Drag gutter left → Palette shrinks, Demo expands
- [ ] Drag gutter right → Palette expands, Demo shrinks
- [ ] Gutter visual feedback (darker gradient on hover/drag)
- [ ] Focus gutter and use ArrowLeft/ArrowRight
- [ ] Reload page → Ratio is restored
- [ ] Dark mode toggle works
- [ ] Palette generation still works
- [ ] No layout shifts or visual corruption
- [ ] Keyboard navigation (Tab to gutter)

### Browser Compatibility

- Chrome/Edge 88+: Full support (Pointer Events)
- Firefox 59+: Full support
- Safari 13+: Full support
- Mobile browsers: Touch events work (via Pointer Events)

## Future Enhancements

Optional nested splits (not implemented yet):
- Inner split for light vs dark within Palette
- Inner split for light vs dark within Demo
- Each would have its own storage key

## Accessibility

- **role="separator"**: Identifies the gutter as a divider
- **aria-orientation="vertical"**: Indicates vertical split
- **tabindex="0"**: Gutter is focusable
- **aria-label**: Describes the purpose
- **Keyboard support**: Arrow keys to adjust ratio
- **Focus visible**: :focus-visible outline for keyboard users

## References

- Pointer Events API: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- Flexbox min-width: https://css-tricks.com/flexbox-truncated-text/
- localStorage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- ARIA Separator: https://www.w3.org/WAI/ARIA/apg/patterns/separator/
