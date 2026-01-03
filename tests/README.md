This folder contains legacy test helpers for automated accessibility scans. The project now uses Playwright + axe via `npm run test:a11y` (see AGENTS.md) and no longer relies on the Puppeteer-based `scan:light` / `scan:dark` scripts.

Current flow (local):

1. Start a local server from `docs/` (example):
	```
	python3 -m http.server 4173 --directory docs
	```
2. In another terminal, run:
	```
	npm run test:a11y
	```
	You can override pages with `A11Y_PAGES` and the base URL with `BASE_URL` if needed.

Legacy files:
- `scan-light.html` and `scan-dark.html` remain for reference but are not used by the current CI flow.

Ignored content (unchanged)
---------------------------
- The automated scans exclude decorative demo canvases that intentionally use palette tokens and therefore may not meet contrast thresholds. The scanner configuration excludes elements matching `.demo-canvas[data-uses-token="canvas"]`.

