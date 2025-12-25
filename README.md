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
````
