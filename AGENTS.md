# AGENTS.md

## Project Purpose
ui-palette-generator is a public-facing design and exploration tool for generating, refining, and evaluating UI color palettes.

The long-term goal of this project is to move beyond random or purely aesthetic palette generation toward **intentional, explainable, and accessibility-aware UI color systems**.

This project supports:
- Exploration and generation of color palettes
- Iterative refinement of palettes for UI use
- Evaluation of contrast, roles, and usage patterns

It is an **assistive design tool**, not a certification or automated compliance system.

## Direction of Travel (Important)
This project is expected to evolve.

Agents and contributors should treat ui-palette-generator as:
- A place to explore better UI color decisions
- A bridge between design intuition and accessibility reasoning
- A foundation for future tooling around contrast, roles, and systematized color use

Short-term features should not block long-term goals such as:
- Palette roles (text, background, accent, state)
- Contrast-aware generation and feedback
- Explainability of color decisions

## Audience and Responsibility
This project is intended for:
- Designers
- Front-end developers
- Accessibility practitioners
- People learning how to reason about UI color systems

All outputs are informational and exploratory.
Responsibility for applying results in production systems remains with qualified humans.

The tool must not present itself as providing definitive WCAG compliance outcomes.

## Scope
The project consists of:
- Static HTML, CSS, and JavaScript
- Client-side color generation, manipulation, and evaluation
- Interactive UI for previewing and adjusting palettes

No server-side processing is assumed unless explicitly documented.

## Conceptual Integrity
The project must maintain clear distinctions between:
- Aesthetic palette generation
- Functional UI color roles
- Accessibility guidance and heuristics

The UI must avoid implying that visually pleasing palettes are automatically accessible.

When accessibility metrics are shown:
- They must be clearly identified
- Their limits must be explained
- They must not be treated as pass/fail judgments

## UI Contract
The UI must:
- Make inputs explicit (base colors, adjustments, roles)
- Show derived values transparently
- Allow users to adjust and iterate predictably
- Avoid hidden normalization, rounding, or inference

If defaults are applied, they must be visible and overrideable.

## Accessibility Position
Accessibility is a core concern of this project.

The project aims to follow WCAG 2.2 AA patterns where feasible, but does not claim formal conformance.

Because the tool is visually oriented:
- Some visualizations may not be fully accessible
- These limitations must be documented
- Non-visual alternatives should be provided where reasonable (text summaries, tables)

## Accessibility Expectations (Minimum Bar)

### Structure and Semantics

### Keyboard and Focus

### Labels, Instructions, and Feedback

### Dynamic Updates

### Motion and Effects


## Icon Strategy For System UI

- Always embed or reference SVGs for system UI icons (alerts, toolbars, navigation, and settings) rather than relying on icon fonts for critical UI elements. Inline or referenced SVGs ensure consistent rendering across environments, are styleable via `currentColor`, and avoid accessibility issues when fonts fail to load.

- Example (inline SVG in alert):

  <div class="alert" role="status" aria-live="polite">
    <svg class="icon-svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <rect x="7" y="5" width="2" height="4" fill="#fff" rx="0.2" />
      <rect x="7" y="3" width="2" height="1" fill="#fff" rx="0.2" />
    </svg>
    <span>System message text</span>
  </div>

- Why: Embedded SVGs are independent of font availability, can inherit color via `currentColor`, and can be scaled or optimized without impacting the rest of the theme tokens that are editable by users.
## Error Handling and Reliability
- Invalid color values must be handled gracefully.
- Errors must be explained in plain language.
- The UI must not fail silently.

## Data Handling and Privacy
- Do not collect or transmit personal data.
- Do not include analytics or tracking by default.
- Any client-side storage must be optional and documented.

## Dependencies
- Prefer minimal, well-understood dependencies.
- Avoid external scripts with unclear provenance.
- Document any third-party libraries used, including purpose and limitations.
- Do not commit secrets or API keys.

## Testing Expectations
Manual testing is required for meaningful changes:
- Keyboard-only interaction testing
- Focus visibility verification
- Verification that information is perceivable without color
- Zoom testing up to 200%

Automated tests are encouraged for color math and transformations but do not replace manual review.

## Contribution Standards
Pull requests should include:
- Description of the change and rationale
- Notes on conceptual impact (palette logic, roles, metrics)
- Notes on accessibility impact
- Documentation of known limitations or trade-offs introduced

## Definition of Done
A change is complete only when:
- Palette generation and transformations are explainable
- UI behavior is predictable and understandable
- Accessibility has not regressed
- Assumptions and heuristics are explicit
- The project remains honest about what it does and does not provide

This project values intentional design, accessibility awareness, and transparency over novelty or visual flair.


## GitHub Pages constraints (required)

All pages must work when hosted under the repository subpath:
- `https://<user>.github.io/<repo>/`

Rules:
- Use relative URLs that respect the repo base path.
  - Prefer `./assets/...` or `assets/...` from the current page.
  - Avoid absolute root paths like `/assets/...` unless you explicitly set and use a base path.
- Navigation links must work from every page (no assumptions about being at site root).
- Do not rely on server-side routing. Every page must be reachable as a real file.
- Avoid build steps unless documented and reproducible. Prefer “works from static files”.
- If using Jekyll:
  - Treat Jekyll processing as optional unless `_config.yml` and layouts are part of the repo.
  - If you use `{{ site.baseurl }}`, use it consistently for links and assets.
- Provide a failure-safe: pages should render a readable error if required data files are missing.

Static asset rules:
- Pin external CDN dependencies (exact versions) and document why each exists.
- Prefer vendoring critical JS/CSS locally to reduce breakage.
- Don’t depend on blocked resources (mixed content, HTTP, or fragile third-party endpoints).

Caching/versioning:
- If you fetch JSON/data files, include a lightweight cache-busting strategy (e.g., query param using a version string) OR document that users must hard refresh after updates.


## Local preview (required before publish)

Test pages via a local HTTP server (not `file://`) to match GitHub Pages behavior.

Examples:
- `npx serve docs -p 8000`

Verify:
- links resolve under a subpath
- fetch requests succeed
- no console errors on load
