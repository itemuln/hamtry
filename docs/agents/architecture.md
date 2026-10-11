# Architecture and ownership

Paths below are relative to `Front-End/client`, unless explicitly noted.

| Subsystem | Entry / files | Responsibility |
| --- | --- | --- |
| Public browser library | `src/library/index.js` | Named exports of framework, components, styles, theme defaults |
| Theme bootstrap | `src/library/theme.js` | Idempotent default style insertion; no persistence or polling |
| Reactive engine | `src/library/core/reactivity.js` | Signals, effects, microtask scheduling, scopes, resource cleanup |
| DOM helpers | `src/library/core/dom.js` | Query, listener, text binding, composed events |
| Element base | `src/library/core/element.js` | Shadow root, one-time render, reconnect-safe scoped setup |
| Native components | `src/library/components/index.js` and sibling implementation files | Custom element registration and reusable controls/cards |
| Shared component CSS | `src/library/design-system/components.css`, `src/library/components/styles.js` | Token consumption and shared constructable stylesheet |
| Token authority | `src/library/design-system/tokens.json`, `theme.js` | Default token metadata, modes, CSS generation, override validation |
| Typography | `src/library/design-system/tokens.css` | Typography classes only; no competing token declarations |
| Saved theme | `theme/hamtry-theme.json` | Validated persisted override data; preserve user edits |
| Theme routes | `server/theme-store.js` | GET/PUT theme, generated CSS, serialized atomic file writes |
| Live stylesheet loader | `public/hamtry-theme.js` | Poll saved CSS, retain last successful theme, notify page |
| Native homepage | `src/app/main.js`, `pages/home.js`, `home.css`, `state/`, `data/`, `index.html` | Consumer composition, hash navigation, local UX/state/data |
| App scene | `src/app/components/hero-scene.js`, `hero-scene.css`, `apartment-scene.js` | Native Shadow DOM scene owner; lazy raw Three renderer |
| Component demo | `src/app/demo.js`, `pages/component-demo.js`, `components/counter.js`, `styles.css`, `components.html` | Isolated component/engine playground |
| React authoring UI | `src/editor/main.jsx`, `src/editor/App.jsx`, sibling editor modules, `editor.html` | Complete separate showcase and explicit draft/save editor |
| Tooling | `vite.config.js`, `jsconfig.json`, `eslint.config.js` | Alias resolution, three page builds, React rules restricted to editor JSX |

## Dependency direction

Framework has no design-system/component/app imports. Components consume the
framework and shared design-system CSS. The public library aggregates these
browser APIs and theme helpers; component internals use relative lower-level
imports, not the public barrel, to avoid circular dependencies. Pages use
`@hamtry/library`. The native library must not import React editor modules.

`@hamtry/library` is configured in both Vite `resolve.alias` and `jsconfig.json`
`compilerOptions.paths`. Keep both mappings synchronized. The barrel is
browser-only: evaluating component modules requires `HTMLElement` and
`CSSStyleSheet`. Node engine tests import `reactivity.js` directly.

## Styling and theme data flow

`tokens.json` → `theme.js` → generated CSS variables → host → shadow descendants.
`components.css` consumes variables; one shared `CSSStyleSheet` is adopted by
component roots. Custom properties inherit across shadow boundaries; normal
page selectors do not directly style internal controls.

Default style insertion precedes the saved style. Persisted dimensions stay in
readable rem form; CSS generation converts them to `calc(var(--u) * n)` and
constrains the layout container. Breakpoint modes are base, tablet ≤64em,
mobile ≤40em. Do not reintroduce fixed declarations in `tokens.css` that fight
the generated live theme.

Editor edits are local drafts. Only explicit Save performs `PUT /api/theme`.
Reset is also a draft. Saved CSS is polled every two seconds by the independent
loader. Theme JSON's generated token summary is not an independent runtime
source; `theme.js` combines source defaults and parsed saved overrides.

The authoring routes are local and do not constitute a production authenticated
editing API. Theme saving does not sync Figma. Static-only hosting cannot write
the shared file. `HAMTRY_THEME_FILE` selects a persistent or isolated test file.

## Product boundary

Hamtry aims to be a Mongolian roommate/room marketplace. Product context says
room providers get an additional dashboard menu; seekers retain shared
navigation/profile features. Those journeys are browser-local prototypes; see [homepage contract](homepage.md).
Build product behavior above the library rather than embedding account,
fetch, authorization, or routing logic in reusable controls.
