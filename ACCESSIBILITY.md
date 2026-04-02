# Accessibility Policy

This repository is focused on producing accessible color systems and tooling for designers and engineers. It documents how accessibility checks are applied, what the tool guarantees, and how to interpret automated results.

## Purpose
- Explain how the tool applies WCAG and APCA checks.
- Describe the "Red Dot" auditor and how to interpret its output.

## Standards Used
- Legislative Floor: WCAG 2.2 AA (sRGB linear math). Text must meet 4.5:1; non-text UI elements must meet 3.0:1 where appropriate.
- Perceptual Target: APCA (Accessible Perceptual Contrast Algorithm). Aim for Lc 75+ for body text and Lc 60+ for UI controls.

## How the Tool Applies Checks
- All color decisions are evaluated by both WCAG and APCA rules (the "Bimodal Validation Protocol").
- The tool computes contrast against the specific container background (contextual auditing).
- Failures are surfaced as "Red Dots" on components and reported in the audit panel.

## Limitations & Notes
- These checks are heuristics and recommendations, not a legal compliance guarantee.
- APCA and WCAG use different math; a change that optimizes one may affect the other. The tool highlights trade-offs.
- Simulations (color-blindness, aging) are approximations intended for exploration.

## Developer Guidance
- Add unit tests for color transforms when changing core color code.
- Document any change to the "Wu Curve" in the CHANGELOG with rationale and visual examples.

## Reporting Issues
- If you find a false positive/negative in the auditor, open an issue with a minimal reproducible test case and expected result.

## Resources
- APCA reference: use `apca-w3` for programmatic checks.
- Color math: `culori` or `culori-js` for OKLCH conversions.

---

## Color Contrast Accessibility Best Practices

> The following section is adapted from the [Color Contrast Accessibility Best Practices](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/COLOR_CONTRAST_ACCESSIBILITY_BEST_PRACTICES.md) reference guide. Because this project is fundamentally about color, contrast guidance is reproduced here in full for easy reference.

Color perception varies greatly across users. People with low vision, color vision deficiencies, or age-related vision changes all depend on sufficient contrast. Meeting contrast requirements benefits everyone: high-contrast interfaces are also easier to read in bright sunlight, on low-quality displays, and in print.

### Core Principle

Sufficient contrast between foreground and background colors is a prerequisite for users to read text, identify UI components, perceive graphical content, and track keyboard focus. Color alone must never be the sole means of conveying information.

All visual interface elements that convey information or require user interaction must meet the applicable WCAG 2.2 Level AA contrast thresholds. Contrast must be maintained in **light mode, dark mode, and forced-colors (high contrast) mode**.

---

### WCAG 2.2 Requirements Overview

| Success Criterion | Level | Requirement | Applies To |
|:---|:---:|:---|:---|
| 1.4.1 Use of Color | A | Color must not be the only visual means of conveying information | All content |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 for normal text; 3:1 for large text | Text and images of text |
| 1.4.6 Contrast (Enhanced) | AAA | 7:1 for normal text; 4.5:1 for large text | Text and images of text |
| 1.4.11 Non-text Contrast | AA | 3:1 against adjacent colors | UI components, graphical objects |
| 2.4.13 Focus Appearance | AA | Focus indicator area ≥ (perimeter of unfocused component in CSS pixels) × 2 CSS pixels; 3:1 contrast change | Keyboard focus indicators |

> **WCAG 2.2 note:** 2.4.13 Focus Appearance is new in WCAG 2.2 at Level AA. Teams that previously targeted 2.4.7 (Focus Visible, AA) must also now satisfy 2.4.13.

---

### Text Contrast (WCAG 1.4.3)

#### Contrast ratio thresholds

| Text type | Minimum (Level AA) | Enhanced (Level AAA) |
|:---|:---:|:---:|
| Normal text (below 18pt / 14pt bold) | **4.5:1** | 7:1 |
| Large text (18pt+ / 14pt+ bold) | **3:1** | 4.5:1 |
| Logotypes (text in logos) | Exempt | Exempt |
| Incidental text (purely decorative) | Exempt | Exempt |
| Disabled controls | Exempt | Exempt |

#### What counts as "large text"

- **18pt** (approximately 24 CSS `px`) or larger in regular weight
- **14pt** (approximately 18.67 CSS `px`) or larger in bold weight

#### Preferred CSS pattern — text colors using custom properties

```css
:root {
  /* Normal body text — 4.5:1 against white background */
  --color-text:        #1a1a1a;   /* contrast vs #fff: 16.75:1 ✓ */
  --color-text-muted:  #595959;   /* contrast vs #fff: 7.0:1   ✓ */

  /* Large heading text — may use 3:1 minimum */
  --color-heading:     #333333;   /* contrast vs #fff: 12.63:1 ✓ */

  /* Link text — meets 4.5:1 against white and has non-color distinction */
  --color-link:        #0066cc;   /* contrast vs #fff: 4.52:1  ✓ */

  --color-background:  #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text:        #e8e8e8;   /* contrast vs #1a1a1a: 13.61:1 ✓ */
    --color-text-muted:  #b0b0b0;   /* contrast vs #1a1a1a:  7.0:1  ✓ */
    --color-heading:     #f0f0f0;
    --color-link:        #66aaff;   /* contrast vs #1a1a1a: 5.74:1  ✓ */
    --color-background:  #1a1a1a;
  }
}
```

#### Images of text

Text embedded in images must meet the same 4.5:1 (or 3:1 large text) requirement. Prefer real text rendered in CSS to avoid this constraint and gain responsive scaling.

---

### Non-text Contrast (WCAG 1.4.11)

Non-text elements that are required for users to understand or operate the interface must meet a **3:1 contrast ratio** against adjacent colors.

#### Applies to

- Form input borders (text fields, checkboxes, radio buttons, select dropdowns)
- Interactive UI component boundaries (buttons without text, sliders, toggles)
- Icons and graphical objects that convey meaning
- Charts and data visualization elements that encode information
- Status indicators (progress bars, meter fills)

#### Does not apply to

- Decorative graphics or illustrations that do not convey meaning
- Inactive or disabled components
- Logos and brand marks
- Information also available in text (the graphical element is supplementary)

---

### Use of Color (WCAG 1.4.1)

Color alone must not be the sole means of conveying information, indicating an action, prompting a response, or distinguishing a visual element. A second, non-color cue must always accompany color.

#### Common failure patterns

```html
<!-- Bad: required field indicated only by red label color -->
<label style="color: red;">Email address</label>
<input type="email">

<!-- Bad: error state communicated only by red border -->
<input type="email" style="border-color: red;">
```

#### Preferred patterns

```html
<!-- Good: required field — asterisk + color -->
<label>
  Email address
  <span aria-hidden="true" class="required-marker">*</span>
  <span class="sr-only">(required)</span>
</label>
<input type="email" aria-required="true">

<!-- Good: error state — icon + text + color + border -->
<div class="field field--error">
  <label for="email">Email address</label>
  <input id="email" type="email" aria-describedby="email-error" aria-invalid="true">
  <p id="email-error" class="error-message">
    <svg aria-hidden="true" focusable="false" class="icon-error">
      <use href="#icon-exclamation"></use>
    </svg>
    Please enter a valid email address.
  </p>
</div>
```

#### Link distinction from surrounding text

Links within paragraphs must be distinguishable from surrounding non-link text by more than color alone when the surrounding text has contrast of 3:1 or greater. Use underline (the browser default) or another non-color visual difference.

---

### Focus Appearance (WCAG 2.4.13)

WCAG 2.2 adds **2.4.13 Focus Appearance** at Level AA. A visible keyboard focus indicator must:

1. Enclose the focused component with a focus indicator area of at least **(perimeter of the unfocused component in CSS pixels) × 2 CSS pixels**.
2. Have a **contrast ratio of at least 3:1** between the focused and unfocused states.
3. Have a **contrast ratio of at least 3:1** against every adjacent color in the unfocused state.

#### Preferred CSS pattern — visible focus ring

```css
:root {
  --focus-ring-color:      #0066cc;
  --focus-ring-width:      3px;
  --focus-ring-offset:     2px;
  --focus-ring-background: #ffffff; /* Override in dark mode below */
}

:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  /* White halo improves visibility on dark surfaces; adapts via custom property */
  box-shadow: 0 0 0 calc(var(--focus-ring-width) + var(--focus-ring-offset))
              var(--focus-ring-background);
}

@media (prefers-color-scheme: dark) {
  :root {
    --focus-ring-color:      #99ccff;
    --focus-ring-background: #1a1a1a; /* Dark halo for dark backgrounds */
  }
}
```

#### Avoid

```css
/* NEVER do this — completely removes focus visibility */
:focus {
  outline: none;
}
```

---

### CSS Custom Properties for Accessible Color Palettes

Centralizing all design-system colors as CSS custom properties makes contrast validation and theming manageable at scale.

```css
:root {
  --color-neutral-900: #1a1a1a;  /* 16.75:1 on #fff */
  --color-neutral-600: #595959;  /*  7.0:1  on #fff */
  --color-brand-500:   #0066cc;  /*  4.52:1 on #fff — OK for normal text ✓ */
  --color-brand-700:   #004c99;  /*  7.59:1 on #fff — OK for all text  ✓ */

  --color-text-primary:   var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-600);
  --color-text-link:      var(--color-brand-500);
  --color-surface:        #ffffff;
  --color-border:         #e8e8e8; /* 3:1 for non-text ✓ */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary:   #e8e8e8;  /* 13.61:1 on #1a1a1a ✓ */
    --color-text-secondary: #a0a0a0;  /*  7.11:1 on #1a1a1a ✓ */
    --color-text-link:      #66aaff;  /*  5.74:1 on #1a1a1a ✓ */
    --color-surface:        #1a1a1a;
    --color-border:         #444444;  /*  3.1:1  on #1a1a1a ✓ */
  }
}
```

---

### Forced Colors Mode (High Contrast)

Windows High Contrast Mode and the CSS `forced-colors` media query replace author colors with a small set of system-defined colors. Interfaces can break if they rely on CSS `background-color` or `color` for information.

Use `outline` for focus indicators — it is preserved in forced-colors mode by default:

```css
/* Good: outline is forced-colors-safe */
:focus-visible {
  outline: 3px solid Highlight;
  outline-offset: 2px;
}

/* Risk: box-shadow may not render in forced-colors mode */
:focus-visible {
  box-shadow: 0 0 0 3px #0066cc; /* May be suppressed */
}
```

Testing forced-colors mode:
- Enable **High Contrast Mode** in Windows Accessibility settings
- In Chrome DevTools → Rendering panel → "Emulate CSS media feature forced-colors: active"
- In Firefox: `about:config` → `ui.forcedColors: 1`

---

### APCA — The Emerging Standard

The **Advanced Perceptual Contrast Algorithm (APCA)** is being developed by the W3C Silver Task Force as a candidate replacement for the WCAG 2.x contrast ratio formula. APCA models human contrast perception more accurately, particularly for dark vs. light text, thin strokes, and saturated colors.

**Current status:** APCA is not yet required by WCAG 2.2. It is expected to appear in WCAG 3.0. Teams adopting APCA today should **continue to meet WCAG 2.2 AA requirements** in parallel and treat APCA as supplemental guidance.

#### APCA lightness contrast (Lc) thresholds (informational)

| Content type | Minimum Lc | Recommended Lc |
|:---|:---:|:---:|
| Normal body text (16px / 400 weight) | 60 | 75 |
| Large heading text (24px+ / 700 weight) | 45 | 60 |
| UI component labels | 45 | 60 |
| Placeholder / muted text | 30 | 45 |

Lc values are **signed**: positive for dark text on a light background, negative for light text on a dark background. Use the **absolute value** when comparing against these thresholds. For example, Lc -75 (white text on dark surface) satisfies the 75 threshold for body text just as Lc 75 does.

---

### Disabled State Contrast

Disabled controls are **exempt** from WCAG 1.4.3 and 1.4.11 contrast requirements. However:

- Provide a clear visual distinction between disabled and enabled states beyond reduced opacity
- Include a tooltip or instructional text explaining when/why a control is disabled
- Avoid relying solely on reduced opacity — always communicate context

```html
<!-- Good: disabled state with explanatory context -->
<button disabled aria-describedby="submit-note">Submit</button>
<p id="submit-note">Complete all required fields to enable the Submit button.</p>
```

---

### Testing and Validation Checklist

#### Automated checks

- [ ] Run axe-core `color-contrast` rule against all pages
- [ ] Run `color-contrast-enhanced` rule for AAA coverage
- [ ] Validate focus indicator contrast with `focus-order-semantics` and `focus-visible` axe rules
- [ ] Integrate contrast checks into CI pipeline using `@axe-core/cli` or pa11y

#### Manual checks

- [ ] Check text contrast for all text sizes using a contrast checker tool
- [ ] Check non-text contrast for all form controls, icons, and data visualizations
- [ ] Verify focus ring is visible on all interactive elements in default and dark modes
- [ ] Test in Windows High Contrast / forced-colors mode
- [ ] Test with browser zoom at 200% and 400%
- [ ] Review all interactive states: default, hover, focus, active, visited, error, disabled

#### Color-independence check

- [ ] View the page in grayscale
- [ ] Confirm all information conveyed by color is also conveyed by text, icons, or patterns

---

### Common Contrast Mistakes

| Mistake | Why it fails | Fix |
|:---|:---|:---|
| Removing focus outline with `outline: none` | Focus invisible for keyboard users (2.4.7, 2.4.13) | Replace with visible custom focus style |
| Placeholder text uses low-contrast gray | Placeholder falls below 4.5:1 (1.4.3) | Use a placeholder color ≥ 4.5:1 or design labels outside the field |
| Error states shown only with a red border or red text | Color is sole cue for error (1.4.1) | Add error icon, text label, and `aria-invalid` |
| Contrast checked only in light mode | Dark mode or high contrast mode may fail | Test all modes |
| Overlay components assume a white background | Background may vary (1.4.3) | Ensure overlay has opaque background with verified contrast |
| Gradient background behind text | Contrast ratio varies across the gradient | Verify contrast at the lowest-contrast region, or use a solid overlay |
| Icon-only buttons with low-contrast icons | Icon fails 3:1 non-text requirement (1.4.11) | Ensure icon has 3:1 contrast against its background |
| SVG `fill` not inheriting theme colors | SVG colors may not adapt in forced-colors mode | Use `currentColor` and CSS variables for SVG fills |

---

### WCAG 2.2 Success Criterion Mapping

| SC | Title | Level | Summary |
|:---|:---|:---:|:---|
| [1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | Use of Color | A | Color is not the sole conveyor of information |
| [1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Contrast (Minimum) | AA | 4.5:1 normal text; 3:1 large text |
| [1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html) | Contrast (Enhanced) | AAA | 7:1 normal text; 4.5:1 large text |
| [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | Non-text Contrast | AA | 3:1 for UI components and graphical objects |
| [2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) | Focus Visible | AA | Keyboard focus indicator is visible |
| [2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) | Focus Appearance | AA | Focus indicator must be sufficiently large and high-contrast |

---

### Contrast-Checking Tools

| Tool | Use case |
|:---|:---|
| [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) | Quick manual checks — text contrast |
| [Accessible Colors](https://accessible-colors.com/) | Find the closest accessible color |
| [Colour Contrast Analyser (TPGi)](https://www.tpgi.com/color-contrast-checker/) | Desktop app for sampling on-screen colors |
| [axe DevTools](https://www.deque.com/axe/devtools/) | Browser extension with contrast violation detection |
| [apcacontrast.com](https://apcacontrast.com/) | APCA-based contrast evaluation |
| [Stark (Figma/Sketch plugin)](https://www.getstark.co/) | Design-time contrast checking |
| [Chrome DevTools CSS Overview](https://developer.chrome.com/docs/devtools/) | Browser-based audit of contrast issues |

---

### Color Contrast References

- [WCAG 2.2 Understanding 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- [WCAG 2.2 Understanding 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [WCAG 2.2 Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [WCAG 2.2 Understanding 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [CSS Color Adjust Module Level 1 (`forced-colors`)](https://www.w3.org/TR/css-color-adjust-1/)
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [SAPC-APCA GitHub Repository](https://github.com/Myndex/SAPC-APCA)
- [Sara Soueidan: A guide to designing accessible, WCAG-conformant focus indicators](https://www.sarasoueidan.com/blog/focus-indicators/)
- [Section 508: Accessibility Bytes — Color Contrast](https://www.section508.gov/blog/accessibility-bytes/color-contrast/)
