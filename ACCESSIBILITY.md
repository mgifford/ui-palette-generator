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
