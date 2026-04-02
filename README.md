# Enterprise UI Palette Generator

This tool helps design accessible UI color palettes that work consistently in both light and dark modes. It builds on the token-based, demo-first approach introduced by Frances Wu, and extends it with automation, contrast checking, and AI-assisted exploration. Human review is always required.

- **Palette:** A single set of semantic tokens renders in light and dark via the parent `data-theme-mode`, enabling consistent overrides and comparisons (including USWDS alignment).
- **Demo:** Identical UI markup runs in light and dark. Visual differences come only from palette values, clarifying how tokens behave in real components, including focus and non-text elements.
- **Usage and contribution:** Generate from a seed color, override tokens, and review WCAG 2.2 and APCA contrast results in the UI. This project is open source—report issues or contribute on GitHub.
- **Generate vs Refine:**
	- **Generate** creates a fresh palette from the seed and current settings (destructive to the current state).
	- **Refine** operates on the existing palette without regenerating it:
		- **Snap to USWDS** aligns semantic tokens to the closest USWDS colors.
		- **Fix contrast** adjusts content tokens to meet WCAG 2.2 and APCA thresholds.
	- Refinement is optional and intentional; it preserves roles and existing theme separation while normalizing results.

> The seed color is a generator input used to derive the palette. It is shown for reference, but semantic tokens derived from it are used for all UI styling to ensure predictable contrast and accessibility.

[Try it out](https://thisisfranciswu.com/enterprise-ui-palette-generator/).

> The production site is published straight from `docs/`. The repository root intentionally does not include an `index.html`, so GitHub shows this README instead.

## To do

In no particular order, allow user to:

- [x] Enjoy refactored CSS
- [x] Enjoy refined UI
- [x] See color values
- [x] Override default settings
- [x] Generate dark mode colors
- [x] See favicon
- [x] Light/dark mode switch
- [x] Generate random accent
- [x] See accent color in input field
- [x] Select from preset seed colors
- [x] But why doesn't it work for #F24BEC?
- [x] See impact of interactive effects
- [x] See usage instructions
- [x] See social media thumbnail and details when shared
- [x] Maybe see future improvements if analytics suggest interest
- [ ] Toggle between WCAG accessibility levels 
- [ ] See WCAG validation
- [ ] Learn how this works
- [ ] Enjoy responsive layout
- [ ] Export colors

## Project Overview

This project is pure HTML, CSS, and vanilla JavaScript—no frameworks, no build tools required for basic use. The build pipeline (npm scripts) is only for asset bundling and SCSS compilation; the output is a static site in `docs/`.

### Accent Non-Content Colors

The palette includes three levels of Accent Non-Content tokens to express visual hierarchy:
- **Strong:** primary UI emphasis (e.g., button backgrounds, selected states, focus rings).
- **Subdued:** secondary emphasis and structure (e.g., table headers, grouped outlines).
- **Soft:** interaction feedback and rhythm (e.g., hover backgrounds, zebra striping).

This hierarchy helps designers reason about when and where to use these colors in real UIs.

### Quick Start

- **No frameworks required.**
- **Works on GitHub Pages and any static webserver.**
- **Deploy by copying the `docs/` folder to your host, or use GitHub Pages.**

### Local Development

```bash
npm install
npm run build
npm start
# Open http://localhost:5000
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

Or manually copy the contents of `docs/` to any static host.

Notes:
- The project uses `webpack` to bundle `js/bundle.js`. The HTML expects `css/main.css` and `js/bundle.js` to be present in the repository root when served.
- If you prefer GitHub Pages to serve from `docs/`, I can update `webpack.config.js` to output into `docs/` and adjust `package.json` scripts.


## Related Tools and Resources

This project is part of a broader ecosystem of accessible color and palette tools. The following resources offer complementary approaches to palette generation, accessibility evaluation, and data visualization.

### UI Color Tools

- [Accessible Color Matrix](https://toolness.github.io/accessible-color-matrix/) — Visualises every foreground/background pair in a palette as a WCAG contrast matrix.
- [Viz Palette](https://projects.susielu.com/viz-palette) — Evaluates palettes for data visualization, including colorblind simulation across multiple deficiency modes.
- [Color Safe](https://colorsafe.co/) — Generates accessible web color combinations from a background color using WCAG guidance.
- [Adobe Leonardo](https://leonardocolor.io/scales.html) — Creates adaptive, contrast-based color scales; open source under the Apache 2.0 license ([GitHub](https://github.com/adobe/leonardo)).

### Color Libraries

- [Palettes (gka)](https://gka.github.io/palettes/) — Generates perceptually uniform color palettes with colorblind-safe optimization.
- [chroma.js](https://gka.github.io/chroma.js/) — JavaScript color manipulation library used in this project for color generation and interpolation.
- [Colorgorical](https://vrl.cs.brown.edu/color) — Generates categorical palettes optimized for information visualization (Brown University VRL).
- [Accessible Color Palette (donnieberg)](https://github.com/donnieberg/accessible-color-palette) — Reference implementation and guidelines for building accessible color palettes.

## AI Disclosure

Yes. AI was used in creating this tool. There be dragons! 
