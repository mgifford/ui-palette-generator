# Contributing

Thanks for contributing! This document describes the workflow, tests, and expectations for changes.

## Getting Started
- Fork the repo and open a branch named `feature/<short-desc>` or `fix/<short-desc>`.
- Run `npm install` and `npm run dev` to work locally.

## Pull Request Checklist
- Include tests for any changes to color math or token extraction.
- Run `npm run contrast` and ensure there are no failures for critical tokens.
- Include visual screenshots or a short animated GIF for UI/visual changes.
- Update `CHANGELOG.md` with a one-line rationale.

## Code Style
- Use existing patterns in the repo. Keep JS modular and prefer CSS-first logic.

## Tests
- Add unit tests under `tests/` for color transformations.
- Contrast checks should be added to the `scripts/contrast-check.js` input set if they test new tokens.

## CI
- PRs must pass `npm test` and `npm run contrast` in CI before merging.

## Issues
- Use clear titles and include steps to reproduce, expected behavior, and actual behavior.
