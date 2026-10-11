# Homepage contract

This is an implemented local UX prototype, not an authenticated marketplace.
Read [architecture](architecture.md) and [API contract](api-contract.md) first.

## Entry and ownership

- `/`: `index.html` → `src/app/main.js` → `hamtry-home` (light DOM).
- `/components.html`: `src/app/demo.js`, component test page, both original counters/forms/cards and chip/dialog consumers.
- `/editor.html`: complete separate React editor, unchanged draft/Save authority.
- `home.js` owns a Scope per connection; stable page DOM, disposed listeners/effects/timer on disconnect. Cards are keyed by ID and reused. Save does not rebuild an unchanged grid, preserving keyboard focus.
- `state/store.js` owns signals for route/filter/kind/saved/role/published. `state/model.js` contains pure filtering/routing/restore rules. Never put fixture/account/routing behavior in library controls.
- Field property writes inside an app effect are wrapped in `untrack`: field setters read internal signals and otherwise accidentally subscribe the page effect, overwriting live typing.

## Navigation and data

Hash routes: `#home`, `#rooms`, `#roommates`, `#saved`, `#dashboard`,
`#listing/<id>`. Unknown routes fall back to home. Missing detail IDs go to rooms
with feedback. Closing the detail modal returns to the previous browse page;
direct detail entry defaults to home behind the modal. Browser Back follows hash
history. Filters are in-memory and survive same-page modal navigation, not reload.
Saved page currently applies the shared filters to both listing kinds.

Fixtures are explicitly identified as classroom examples. Prices/profile descriptions
are sample content. `hamtry-demo-v1` localStorage schema: `{version:1,saved:string[],
role:'seeker'|'provider',published:{id,title,district,price,description}[]}`. Restored
records are validated/bounded and images/type are chosen by the app, not storage.
Only explicit UI actions write. Storage failures keep current UI state and show
feedback. Demo role controls navigation only; it grants no backend authority.
Publishing is form validation → preview → edit or confirm → browser-local list;
max 20 records, example room image. Untrusted text uses textContent/attributes,
never templated HTML. Real authentication, contact, uploads and persistence are absent.

## App scene (not a library export)

`hamtry-hero-scene` extends HamtryElement, open Shadow DOM. Public properties:
`paused:boolean`, `rotationSpeed:number` (finite, clamped 0..1, default .18),
`selectedSpace:'bedroom'|'living'|'kitchen'`. Button/pointer selection emits
`hamtry-space-select {space}`. `data-scene-state`: idle/loading/ready/fallback.

`hero-scene.js` synchronously registers cancellation/cleanup before lazy importing
`apartment-scene.js`. IntersectionObserver rootMargin 120px triggers load and
pauses distant/offscreen motion. ResizeObserver owns canvas sizing. Hidden document,
reduced-motion preference, pause, zero speed and context loss stop RAF. Reduced
motion allows manual orbit/select. WebGL2 failure/context loss shows SVG + HTML;
context restoration is not retried automatically. New canvas on reconnect avoids
reusing the intentionally lost disposed context. State survives reconnect.

The renderer module owns model geometries/materials, shadow map and renderer;
dispose cancels RAF, controls/listeners, GPU resources and forces context loss.
No borrowed textures or external models. DPR max 1.5, shadow map 1024. Camera orbit
limits, raycast floor zones, selected-zone tint, subtle procedural bob/sway. Colors
read shared CSS tokens and recolor on `hamtry-theme-change`. The model is illustrative,
not a real listing floorplan/tour. Canvas is aria-hidden; all selection/pause controls
are native buttons outside it. Three is lazy and separate from initial app and React.

## Visual direction

Original Hamtry content inspired by https://3destate.pl/en/ spatial presentation
and https://montempz.mn/ typography/navigation/section pacing. Token-derived warm
paper, brand dark/lime/pink, `--font-display` Manrope. Page mixes surface/base with
white; it does not rewrite saved overrides. Do not replace authoritative theme
values merely to make a screenshot match defaults.

## Verified 2026-10-11

Node model/framework/theme tests, ESLint and three-entry production build.
Chromium: filter combination, live query and focus retention, empty/reset, modal
Escape, saved/reload, local role/post/preview/edit/validation/reload, untrusted text,
responsive widths 320/360/390/768/1440, scene pause/reduced motion/offscreen/reconnect, simulated hidden document/context loss,
simulated unavailable WebGL2. See screenshots in `output/playwright/` from repo root.
Safari/Firefox, low-end physical-device performance, backend and production acceptance
remain unverified. Three's lazy bundle is approximately 565 kB minified / 141 kB gzip;
Vite emits the standard >500 kB chunk warning. No deploy/push or theme Save performed.
