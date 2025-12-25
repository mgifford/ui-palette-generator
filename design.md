# Color Token Design Strategy

This document explains the design decisions behind the use of color tokens in the UI Palette Generator demo, and how those tokens are applied consistently across light and dark modes.

The goal is not to showcase arbitrary color usage, but to demonstrate a **deterministic, auditable, and accessible mapping** between color tokens and UI roles.

---

## Orientation (What the tool does)

- **Background:** Helps design accessible UI color palettes that stay consistent across light and dark modes, extending Frances Wu's token-based, demo-first approach with automation, contrast checks, and AI-assisted exploration. Human review is always required.
- **Palette:** A single set of semantic tokens renders in light and dark via parent `data-theme-mode`, enabling aligned overrides and comparisons (including USWDS-friendly usage).
- **Demo:** Identical markup runs in both themes; differences come only from palette values, exposing token behavior for text, focus, and non-text elements.
- **Usage and contribution:** Generate from a seed, override tokens, and review WCAG 2.2 and APCA contrast results in-product. Open source—issues and improvements welcomed on GitHub.

---

## Core Principles

1. **Semantic over aesthetic**
   Colors are assigned based on *what an element is doing*, not how it looks.

2. **Deterministic mapping**
   Given a token name, it should be clear:
   - what UI role it supports
   - where it is expected to appear
   - what *not* to use it for

3. **Theme symmetry**
   Light and dark modes use the same token IDs.
   Only token values change.

4. **Accessibility-first intent**
   Token roles are chosen to support WCAG 2.2 AA contrast expectations.
   Color is never the sole indicator of state or meaning.

5. **Demonstrable coverage**
   Every token defined in the palette is intentionally represented in the Demo UI.

---

## Seed vs Semantic Tokens

- **Seed (generator input):** A single user-provided color used to derive the palette. It is displayed for reference only and is not applied directly to UI components.
- **Semantic tokens:** Named roles such as canvas, card, content, and non-content colors. These are tuned for accessibility and are the only colors used in the demo UI (text, buttons, focus, and surfaces).
- **Why this separation:** The seed alone cannot guarantee contrast or role fit. Semantic tokens are adjusted to meet contrast expectations and should be used wherever a “brand” or primary color is needed in the UI.

Seed remains visible to explain where the palette comes from, but the demo and guidance always map UI elements to semantic tokens.

---

## Generation vs Refinement

- **Generate is creative and destructive:** It takes the seed plus current settings and produces a new palette from scratch. Running it replaces the current palette state.
- **Refine is constraint-based and deterministic:** It operates on the existing palette to enforce alignment or accessibility without re-running generation. The same palette plus the same refine action yields the same result.
- **Snap to USWDS:** Maps each semantic token (excluding the seed) to the closest USWDS color, preserving token roles and light/dark separation. This is normalization, not creation.
- **Fix contrast:** Adjusts only content foreground tokens (accentContentStrong/Subdued/Baseline, neutralContentStrong/Subdued) to meet WCAG 2.2 AA and APCA thresholds, preferring lightness adjustments and minimal hue change. Non-content tokens are left untouched unless downstream contrast requires them.
- **Seed is excluded from refinement:** It remains an input reference; refinement preserves semantic intent and applies constraints to the tokens that ship to UI.

Refinement is explicit and never automatic so that designers can see when and how constraints are applied.

---

## Token Categories and Their Roles

### Seed

**Purpose**
- Source color for palette generation only (input, not a UI role).

**Usage**
- Not used directly in UI components.
- Used solely to derive accent content and non-content families.
- Displayed for reference so users see the input that generated the palette.

**Rationale**
Using the seed directly for text or controls often fails contrast and creates brittle designs; semantic tokens are tuned to meet contrast and role expectations.

---

### Canvas

**Purpose**
- The page-level background layer.

**Usage**
- Demo panel background.
- Large, non-elevated surfaces.

**Rationale**
Canvas establishes the overall luminance context for the UI.

---

### Card

**Purpose**
- Elevated surface for grouped content.

**Usage**
- Cards
- Tab panels
- Editor containers
- Data visualization containers

**Rationale**
Cards create visual hierarchy and separation without relying on borders alone.

---

### Input Surface

**Purpose**
- Dedicated surface for user-editable controls.

**Usage**
- Text inputs
- Textareas
- Contenteditable regions

**Fallback**
- If no dedicated input token exists, `card` is used.

**Rationale**
Inputs need stronger affordance than general surfaces, especially for accessibility and usability.

---

## Accent Non-Content Tokens

Used for **UI structure, affordances, and state**, not for primary readable text.

### Accent Non-Content Baseline

**Usage**
- Subtle accent borders
- Low-emphasis separators

**Rationale**
Provides accent presence without visual dominance.

---

### Accent Non-Content Soft

**Usage**
- Hover backgrounds
- Selected list items
- Filled tags
- Alert backgrounds

**Rationale**
Communicates state or grouping without overpowering content.

---

### Accent Non-Content Subdued

**Usage**
- Secondary hover states
- Outline button hover fills
- Subtle accent outlines

**Rationale**
Supports layered interaction states.

---

### Accent Non-Content Strong

**Usage**
- Focus rings
- Primary button backgrounds
- Checkbox fills
- Active tab indicators
- Data visualization fills where meaning is “control” or “state”

**Rationale**
This is the highest-emphasis non-content accent and must remain highly visible.

---

## Accent Content Tokens

Used for **readable text and icons that carry brand or accent meaning**.

### Accent Content Baseline

**Usage**
- Links in body text
- Mildly accented copy

**Rationale**
Provides brand voice without overwhelming neutral typography.

---

### Accent Content Subdued

**Usage**
- Helper text
- Notes
- Secondary accent copy

**Rationale**
Keeps accent tone while reducing emphasis.

---

### Accent Content Strong

**Usage**
- Emphasized headings
- Callout titles
- Accent icons paired with neutral text

**Rationale**
Used sparingly for emphasis where contrast is verified.

---

## Neutral Non-Content Tokens

Used for **structure and layout**, not meaning.

### Neutral Non-Content Soft

**Usage**
- Hairline dividers
- Table gridlines
- Subtle textures and patterns

---

### Neutral Non-Content Subdued

**Usage**
- Default borders
- Inactive outlines
- Input borders

---

### Neutral Non-Content Strong

**Usage**
- Strong outlines
- Secondary button backgrounds
- Prominent structural UI

---

## Neutral Content Tokens

Used for **most readable UI text**.

### Neutral Content Strong

**Usage**
- Body text
- Labels
- Table text
- Editor content

**Rationale**
This is the default text color for readability.

---

### Neutral Content Subdued

**Usage**
- Metadata
- Captions
- Placeholder text
- Secondary information

---

## Applying Tokens in the Demo

- Tokens are assigned via `data-uses-token` attributes.
- CSS maps tokens to properties such as:
  - `color`
  - `background-color`
  - `border-color`
  - `outline-color`
- SVG icons use `currentColor` to inherit token-driven text color.
- Charts and data visualizations explicitly reference token variables.

Every token defined in the palette is intentionally exercised in the Demo UI.

---

## Inline Contrast Report

**Purpose**
- Surface a fast, explainable contrast check for common pairings without claiming formal WCAG conformance.

**What it measures**
- WCAG 2.2 AA: text at $4.5{:}1$, non-text/focus at $3{:}1$ (aligned to demo usage).
- APCA heuristics: text/non-text/focus target $60$; large text reserved at $45$ for future sizing-aware passes.
- Foregrounds checked: `seed`, accent content trio, neutral content duo.
- Backgrounds checked: `canvas`, `card`, accent and neutral soft non-content fills.

**When it runs**
- After palette generation, CSV import, and custom overrides (including URL hash accent parsing).
- Re-validates on resize so placement stays below Settings on desktop and before Palette Transfer on mobile.

**Output shape**
- Groups by theme, then by foreground token; lists each background with WCAG badge and APCA badge (`APCA n/a` if the browser build lacks APCA support).
- Uses token labels so users can map rows back to palette roles.

**Limitations**
- Heuristic only; does not cover every UI state or size nuance. Users must still validate real UI contexts.

---

## What This Strategy Avoids

- Hard-coded colors in demo markup.
- Visual-only token naming.
- Using color alone to convey meaning.
- Divergent behavior between light and dark modes.

---

## Future Extensions

- Automated token coverage validation.
- Programmatic checks to ensure every token appears in the Demo.
- Size-aware APCA thresholds and component-level contrast evaluation.

---

This strategy ensures the Demo is not just visually appealing, but **explainable, testable, and extensible**.