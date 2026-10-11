# Editing and verification workflow

## Before editing

Confirm the canonical Hamtry checkout, read root instructions, and inspect local
status. The chat's project mirror can be a different directory. Preserve saved
theme overrides, unrelated logs, user-added skills, and editor settings. Do not
reset dirty files to get a clean diff.

Read the relevant subsystem and API contract first. Prefer a focused change
inside the existing component family. Page code imports `@hamtry/library`;
internal implementation imports lower layers relatively. Avoid circular imports.
Explain decisions in Mongolian code comments without translating API names.

## Adding a component

1. Check available token names, component CSS, and current component patterns.
2. Extend `HamtryElement`; create instance state in fields and stable DOM in render.
3. Apply shared component styles and use CSS variables for design values.
4. Register listeners/effects in setup. Return cleanup for resources; use the
   existing scope instead of manually duplicating lifecycle cleanup.
5. Define attributes/properties, slots/parts, accessibility, and emitted events.
6. Add registration and public exports intentionally. Keep page data/fetch/auth
   above the library. Add a demo consumer when useful.
7. Update human examples and the agent API contract with any behavior change.

Form controls must keep native input semantics plus form association. Validate
FormData, reset/defaults, disabled fieldsets, and keyboard interaction when
changing them. Do not replace their DOM on every state update or lose focus.
Future Three.js resources belong to owned mount cleanup: cancel frame loops and
dispose renderer/materials/geometries on removal. No 3D feature is currently
implemented.

## Validation commands

Run from `Front-End/client` using the configured RTK wrapper:

```sh
rtk npm test
rtk npm run lint
rtk npm run build
rtk git diff --check
```

Tests currently cover signal equality, batching, conditional dependencies,
nested effects, disposal/errors/cycles, and theme persistence/validation.
Match additional validation to the change. Documentation-only edits need link,
path, example, and factual review; public alias changes need lint/build and a
browser import smoke check. Do not add tests that merely repeat comments.

## Browser acceptance

Use the Playwright skill/CLI when automating browser checks. Exercise relevant
cases, rather than only checking that HTML loads:

- Independent instances; functional updates; no stale DOM/listeners after removal
  and reconnect; state preserved on reconnect.
- Valid/invalid required/email input, expected FormData, form reset/default
  selected option, disabled fieldsets, programmatic properties, cancellable submit.
- Radio arrows/tab stop, tab Arrow/Home/End navigation, card save event, alert dismiss.
- Responsive overflow at 320/390/768/1440; shadow inheritance; root text scaling.
- Editor drafts isolated; explicit save shared; reload persistence; initial/error
  behavior when a theme-related change requires it.
- Built `/` and `/editor.html` served by the authoring server; native page stays
  independent of the React editor entry.

Theme-save tests must use an isolated temporary `HAMTRY_THEME_FILE`, not the
user's authoritative theme. Stop test servers and remove only test-owned files.
Keep any requested development preview available and report its actual URL.

Browser checks so far used Chromium. Firefox/Safari and production deployment
have not been accepted. The library requires modern Shadow DOM, constructable
stylesheets, and form-associated custom element support. Do not introduce
legacy/polyfill layers without a new requirement.

## Handoff

Report the concrete change, checks performed, and material unverified behavior.
Do not claim publishing/deploying from build success. No npm publication,
production deployment, commit, or push is implied by editing local code.
If an API changes, update the public barrel, demo, human guide, and agent
contract together. Do not store task-specific progress as permanent architecture.
