# Enterprise UI Palette Generator
```markdown
# Enterprise UI Palette Generator

This is a tool to automate the generation of accessible enterprise UI color palettes.

It draws inspiration from [Radix UI's custom color palette tool](https://www.radix-ui.com/colors/custom), but its color generation rules are mostly based on those I laid out in a [Medium article I wrote](https://uxdesign.cc/a-systematic-approach-to-generating-enterprise-ui-color-palettes-ecaf0c164c17).

[Try it out](https://thisisfranciswu.com/enterprise-ui-palette-generator/)!

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
