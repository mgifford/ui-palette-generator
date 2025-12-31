# Forced Colors Mode: Comprehensive Best Practices Guide

## Overview and Context

**What is Forced Colors Mode?**
- A display mode where users override website colors with their own high-contrast color scheme
- Also known as Windows High Contrast Mode (WHCM) or Contrast Themes
- Affects approximately **4% of Windows users** (Microsoft data)
- Available in Windows 11 (Contrast Themes) and Windows 10 (High Contrast Mode)

**Core Philosophy:**
> "High contrast mode is not about design anymore but strict usability. You should aim for highest readability, not color aesthetics." — Kitty Giraudel

> "Your job for WHCM users is to respect their color choices and use them appropriately. Do not override the feature because you may find something ugly. Ugly and usable trumps pretty and unusable every time." — Adrian Roselli

> "Making things obvious is the most important consideration" — Go Make Things

**Primary Goal:** Let forced colors do its thing. Use native HTML semantics so the browser knows how to render content correctly.

---

## What Gets Removed vs. What Stays

**CSS Properties That Are Removed/Replaced:**
- Background colors and gradients
- Text colors
- Border colors
- Outline colors
- Box shadows
- Text shadows
- Most color-related properties

**What Survives:**
- SVG `fill` and `stroke` (requires manual handling)
- Images from `url()` (background images, `<img>` tags)
- Content structure and layout
- Native HTML semantics and ARIA

**Impact:**
- All colors are replaced with user's chosen system colors
- Focus must shift from aesthetics to clarity and usability
- Visual hierarchy depends on borders, thickness, spacing—not color

---

## System Colors (W3C CSS Color Module Level 4)

**Color Pairs** (guaranteed legible combinations):

| Foreground | Background | Purpose |
|------------|-----------|---------|
| `CanvasText` | `Canvas` | Default text on default background |
| `LinkText` | `Canvas` | Unvisited links |
| `VisitedText` | `Canvas` | Visited links |
| `ActiveText` | `Canvas` | Active links (being clicked) |
| `ButtonText` | `ButtonFace` | Button text on button background |
| `FieldText` | `Field` | Form input text |
| `HighlightText` | `Highlight` | Selected text (user highlight) |
| `MarkText` | `Mark` | Marked/highlighted content (like `<mark>`) |
| `SelectedItemText` | `SelectedItem` | Selected UI items (dropdowns, menus) |
| `AccentColorText` | `AccentColor` | Accent UI elements |

**Special Colors:**
- `GrayText` - Disabled text (use sparingly, may have low contrast)
- `ButtonBorder` - Button borders (border-only, no fill)

**Critical Rules:**
1. **Use color PAIRS** - Don't mix system colors arbitrarily
2. **Users customize colors** - Including low-contrast themes by choice
3. **Don't assume high contrast** - Users may prefer subtle differences
4. **Respect choices** - Never override with `forced-color-adjust: none` unless absolutely necessary

---

## CSS Techniques

### 1. Transparent Border/Outline Technique

**Problem:** Elements with `border: none` or `outline: none` lose visual boundaries in forced colors.

**Solution:** Use transparent borders/outlines that become visible automatically:

```css
.card {
  border: 1px solid transparent;
  /* Will show as user's chosen color in forced colors */
}

.button:focus {
  outline: 2px solid transparent;
  /* Better than outline: none */
}
```

**Why it works:** Forced colors mode respects transparent color declarations and renders them with appropriate system colors.

### 2. Thick Borders for Visual Separation

Use border thickness to create hierarchy and visual separation:

```css
/* Modals */
.modal {
  border: 10px solid transparent;
}

/* Dropdowns */
.dropdown {
  border: 3px solid transparent;
}

/* Buttons */
.button {
  border: 2px solid transparent;
}

/* Tables */
table {
  border: 1px solid transparent;
}

.table-cell {
  border: 1px solid transparent;
}
```

**For standout elements (Go Make Things technique):**
```css
.callout {
  border: 0.5em solid transparent;
}
```

### 3. Forced-Color-Adjust Property

**Use sparingly** - Only for exceptions where you MUST preserve colors.

```css
/* Color pickers - must show actual colors */
.color-swatch {
  forced-color-adjust: none;
}

/* Tooltips with semantic color coding */
.tooltip-error {
  forced-color-adjust: none;
  background: red;
  color: white;
}

/* Default (let forced colors work) */
.normal-content {
  forced-color-adjust: auto; /* default, no need to declare */
}
```

**When to use `forced-color-adjust: none`:**
- Color swatches in color pickers
- Syntax highlighting in code editors
- Diagrams where color has semantic meaning
- Tooltips with color-coded severity

**When NOT to use:**
- Regular UI components
- Navigation elements
- Form controls
- Body content

### 4. Media Query for Forced Colors

```css
@media (forced-colors: active) {
  /* Specific adjustments for forced colors mode */
  
  /* Fix SVGs (workaround for currentColor bug) */
  .icon {
    fill: CanvasText;
  }
  
  .link-icon {
    fill: LinkText;
  }
  
  /* Add borders where backgrounds were removed */
  .card {
    border: 2px solid CanvasText;
  }
  
  /* Ensure focus is visible */
  button:focus {
    outline: 2px solid CanvasText;
    outline-offset: 2px;
  }
}
```

**Combine with color scheme preference:**
```css
@media (forced-colors: active) and (prefers-color-scheme: dark) {
  /* Dark theme specific adjustments */
}

@media (forced-colors: active) and (prefers-color-scheme: light) {
  /* Light theme specific adjustments */
}
```

### 5. Patterns for Common Components

**Buttons:**
```css
.button {
  background: #0066cc;
  color: white;
  border: 2px solid transparent;
  padding: 0.5em 1em;
}

.button:hover {
  background: #0052a3;
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.button:disabled {
  opacity: 0.5; /* Only use opacity for :disabled */
}

@media (forced-colors: active) {
  .button {
    /* Browser handles colors automatically */
    /* border becomes visible */
  }
}
```

**Links:**
```css
a {
  color: blue;
  text-decoration: underline;
}

a:hover,
a:focus {
  background: lightblue;
  outline: 2px solid transparent;
}

a:visited {
  color: purple;
}

@media (forced-colors: active) {
  a:hover,
  a:focus {
    /* background is removed, outline becomes visible */
    text-decoration: underline;
    font-weight: bold; /* Extra visual weight */
  }
}
```

**Form Inputs:**
```css
input,
textarea,
select {
  background: white;
  color: black;
  border: 1px solid #ccc;
  padding: 0.5em;
}

input:focus {
  border-color: blue;
  outline: 2px solid transparent;
}

@media (forced-colors: active) {
  input {
    /* Browser applies Field/FieldText colors */
    border: 1px solid FieldText;
  }
}
```

**Card/Container Pattern (WWU Example):**
```css
.announcement {
  background: green;
  color: white;
  border: medium solid transparent;
  padding: 1em;
}

.announcement-icon {
  background: blue;
  border-right: medium solid transparent;
}

/* In forced colors, backgrounds disappear but borders remain */
```

**Charts and Data Visualization:**
```css
/* Use patterns/textures, not just color */
.bar-chart .bar:nth-child(1) {
  background: repeating-linear-gradient(
    45deg,
    currentColor,
    currentColor 2px,
    transparent 2px,
    transparent 6px
  );
}

.bar-chart .bar:nth-child(2) {
  background: repeating-linear-gradient(
    -45deg,
    currentColor,
    currentColor 2px,
    transparent 2px,
    transparent 6px
  );
}

/* Different patterns for each data series */
```

---

## SVG Handling

**Problem:** SVGs may not convert properly due to `currentColor` bug in forced colors mode.

**Solution:** Use system colors explicitly in forced colors media query:

```css
.icon {
  fill: #003f87; /* Brand color */
}

@media (forced-colors: active) {
  .icon {
    fill: CanvasText; /* Match text */
  }
  
  .link-icon {
    fill: LinkText; /* Icons inside links */
  }
  
  .button-icon {
    fill: ButtonText; /* Icons on buttons */
  }
}
```

**WWU Example (Social Media Icons):**
```css
svg {
  fill: #003f87; /* Western blue */
}

@media (forced-colors: active) {
  svg {
    fill: LinkText; /* Since links wrap SVGs */
  }
}
```

---

## Testing Methods

### Windows Shortcuts
**Toggle Contrast Theme:**
- Left Alt + Left Shift + Print Screen
- Fastest way to test on Windows

### Browser DevTools

**Chrome/Edge:**
1. DevTools → More Tools → Rendering
2. Scroll to "Emulate CSS media feature forced-colors"
3. Select "forced-colors: active"

**Firefox:**
1. about:config
2. Search for `ui.useAccessibilityTheme`
3. Set to `1` for high contrast

### Testing Checklist
✅ Test in **Firefox AND Chromium** (different rendering)  
✅ Test **light AND dark** themes  
✅ Check focus indicators are visible  
✅ Verify borders appear on containers  
✅ Confirm SVGs have adequate contrast  
✅ Test hover/active states show visual change  
✅ Verify forms are usable  
✅ Check images with semi-transparent overlays  

---

## Cross-Browser Issues

**Firefox vs Chromium differences:**
- `border-image` handling varies
- `color-mix()` has inconsistencies
- Text backplate rendering differs
- Some SVG filters may break

**Recommendation:** Always test in both browser engines with both light and dark forced-colors themes.

---

## The 7 Strategies Framework (CSSence)

### 1. Do Nothing
Design to work automatically with native HTML. Best approach when possible.

### 2. Hide in Plain Sight
Use transparent borders/outlines that become visible in forced colors.

### 3. Go the Extra Mile
Use `@media (forced-colors: active)` with `prefers-color-scheme` for theme-specific adjustments.

### 4. Use the Force
Apply `forced-color-adjust: none` for exceptions like color pickers.

### 5. Be Bold
Use thick borders for clear visual separation (10px modals, 3-4px dropdowns, 2px buttons).

### 6. Know Where to Stop
- Don't misuse system colors (use pairs correctly)
- Avoid opacity except for `:disabled` states
- Don't fight user preferences

### 7. Over to You
Community collaboration and testing with real users.

---

## Best Practices Summary

### DO:
✅ Use native HTML semantics  
✅ Use transparent borders instead of `border: none`  
✅ Use thick borders for visual hierarchy  
✅ Test with real forced colors modes (not CSS simulation)  
✅ Fix SVG colors in `@media (forced-colors: active)`  
✅ Use more than color to convey meaning  
✅ Respect user preferences (ugly + usable > pretty + broken)  
✅ Use system color PAIRS appropriately  
✅ Test in multiple browsers and themes  
✅ Make focus/hover states obvious with borders/outlines  

### DON'T:
❌ Use `border: none` or `outline: none` without alternatives  
❌ Rely on background colors alone for boundaries  
❌ Use `forced-color-adjust: none` everywhere  
❌ Mix system colors arbitrarily (respect pairs)  
❌ Assume all forced-colors users want high contrast  
❌ Use images of text (won't convert to user's colors)  
❌ Use color alone to indicate states (hover, active, disabled)  
❌ Override user choices for aesthetic reasons  
❌ Use opacity except for `:disabled` states  
❌ Depend on shadows or gradients for UI comprehension  

---

## Common Pitfalls

### 1. Background Toggle Switches
**Problem:** Background color changes don't show in forced colors.

**Solution (Go Make Things):**
```css
.toggle:checked {
  background-color: CanvasText;
}
```

### 2. Semi-Transparent Image Overlays
**Problem:** Images with semi-transparent overlays may not have adequate contrast in forced colors.

**Solution:** Test images in forced colors mode and add borders or text alternatives if needed.

### 3. Color-Only Information
**Problem:** Using only color to show "error" (red) vs "success" (green).

**Solution:** Add icons, text labels, or other visual indicators beyond color.

### 4. Hidden Focus Indicators
**Problem:** `outline: none` on focus makes keyboard navigation impossible.

**Solution:**
```css
button:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}
```

### 5. Text Backplates
**Issue:** Browser auto-adds backplates to text for readability, can be hard to debug.

**Approach:** Accept backplates as browser behavior, design with sufficient spacing.

---

## Resources

### Articles (In Order of Comprehensiveness)
1. **Polypane: Forced Colors Explained** (Most comprehensive)  
   https://polypane.app/blog/forced-colors-explained-a-practical-guide/

2. **CSSence: Forced Colors Mode Strategies** (7-strategy framework)  
   https://cssence.com/2024/forced-colors-mode-strategies/

3. **Adrian Roselli: Windows High Contrast Mode and System Colors**  
   https://adrianroselli.com/2021/02/whcm-and-system-colors.html

4. **WWU: Support Forced Colors Modes** (Practical examples with screenshots)  
   https://marcom.wwu.edu/accessibility/guide/support-forced-colors

5. **Sparkbox: Supporting High Contrast Mode**  
   https://sparkbox.com/foundry/supporting_high_contrast_mode

6. **OidaIsDeS: Forced Colors Mode**  
   https://oidaisdes.org/forced-colors-mode.en/

7. **Go Make Things: Forced Colors Mode**  
   https://gomakethings.com/forced-colors-mode/

8. **Hashrocket: Enhancing Web Accessibility with Forced Color Mode**  
   https://hashrocket.com/blog/posts/enhancing-web-accessibility-with-html-s-forced-color-mode

### Official Documentation
- **W3C CSS Color Module Level 4** (System colors specification)  
  https://www.w3.org/TR/css-color-4/#css-system-colors

- **MDN: forced-colors media feature**  
  https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors

- **Windows Blog: Styling for High Contrast Mode**  
  https://blogs.windows.com/msedgedev/2020/09/17/styling-for-windows-high-contrast-with-new-standards-for-forced-colors/

### Videos
- **Mike Herchel: Practical Styling in Forced Colors Mode**  
  https://www.youtube.com/watch?v=wLD5CYRhyZY

### Testing Tools
- **Chrome DevTools: Forced Colors Emulation**  
  https://developer.chrome.com/docs/devtools/rendering/emulate-css/#emulate-css-media-feature-forced-colors

- **Microsoft Edge: Forced Colors Emulation**  
  https://melanie-richards.com/blog/forced-colors-emulation/

---

## WCAG Criteria Related to Forced Colors

- **1.4.1 Use of Color (Level A)** - Don't use color alone to convey information
- **1.4.8 Visual Presentation (Level AAA)** - Allow user color selection

**Note:** Forced colors mode support helps with these criteria but is not explicitly required by WCAG 2.2.

---

## Implementation Checklist

When adding forced colors support to a project:

- [ ] Replace `border: none` with `border: [width] solid transparent`
- [ ] Replace `outline: none` with `outline: [width] solid transparent`
- [ ] Add thick borders for visual separation (modals, dropdowns, buttons)
- [ ] Fix SVG colors in `@media (forced-colors: active)` block
- [ ] Ensure focus states use borders/outlines, not just background
- [ ] Verify hover states show visible change beyond color
- [ ] Check form inputs have visible boundaries
- [ ] Test with Windows High Contrast Mode (or browser emulation)
- [ ] Test in both Firefox and Chrome/Edge
- [ ] Test with both light and dark forced-colors themes
- [ ] Verify no information is conveyed by color alone
- [ ] Document any use of `forced-color-adjust: none` with justification
- [ ] Check images of text (avoid if possible)
- [ ] Review semi-transparent image overlays for contrast
- [ ] Ensure keyboard focus is always visible

---

## Code Template: Complete Forced Colors Support

```css
/* Base styles */
.component {
  background: #f0f0f0;
  color: #333;
  border: 2px solid transparent; /* Becomes visible in forced colors */
  padding: 1em;
}

.component:hover {
  background: #e0e0e0;
  outline: 2px solid transparent; /* Hover indication */
  outline-offset: 2px;
}

.component:focus {
  border-color: #0066cc;
  outline: 2px solid transparent;
}

.component-icon {
  fill: currentColor;
}

/* Forced colors adjustments */
@media (forced-colors: active) {
  .component {
    /* Borders become visible automatically */
  }
  
  .component:hover {
    /* Outline becomes visible */
    font-weight: bold; /* Extra differentiation */
  }
  
  .component-icon {
    /* Fix currentColor bug */
    fill: CanvasText;
  }
}

/* Dark theme specific (optional) */
@media (forced-colors: active) and (prefers-color-scheme: dark) {
  /* Adjustments for dark forced-colors themes */
}

/* Exception: color swatch */
.color-swatch {
  forced-color-adjust: none; /* Must show actual color */
  width: 2em;
  height: 2em;
  border: 1px solid #000;
}
```

---

## Final Reminder

**Forced colors mode is not about making your design look good—it's about making it usable.**

The user has deliberately chosen their color scheme for readability or medical necessity. Your job is to ensure your content structure, interactive elements, and visual boundaries remain clear when colors are replaced.

When in doubt:
1. Use native HTML
2. Add transparent borders
3. Make things obvious
4. Test with real forced colors modes
5. Respect user choices

Ugly and usable beats pretty and broken every time.
