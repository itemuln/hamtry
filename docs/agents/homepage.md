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

The homepage hero search uses two large SVG choices on a centered cream surface (max-width 40rem),
with centered icon-label groups:
`Өрөөнүүдийг үзэх` resets filters and routes directly to `#rooms`;
`Хамтрагч хайх` reveals the location/budget form and updates `aria-expanded`.
The form has a stable `roommate-search` id and is hidden outside roommate mode.
Submit is delegated from the page, uses native FormData and routes to `#roommates`.

The hero map action is a cream button-like anchor with an authored SVG map icon,
labeled `Газрын зургаас харах`, navigating to the existing `#map` route.

On `#home`, `.experience-intro` replaces the repeated listing teaser: an authored
CSS door anchor opens `/explore.html#inside/home`, the city action opens
`/explore.html#city/home`, and the lamp toggles only its introduction panel's
`data-lights-off` state with an accessible pressed state and updated action label.
It adds no second WebGL renderer. The original `#results` remains in the page and
appears on browse, saved and provider routes. The skip link focuses the visible
introduction heading on home and the result heading on other routes.

Hash routes: `#home`, `#map`, `#rooms`, `#roommates`, `#saved`, `#dashboard`,
`#listing/<id>`. Unknown routes fall back to home. Missing detail IDs go to rooms
with feedback. Closing the detail modal returns to the previous browse page;
direct detail entry defaults to home behind the modal. Browser Back follows hash
history. Filters are in-memory and survive same-page modal navigation, not reload.
Saved page currently applies the shared filters to both listing kinds.

Fixtures and their map coordinates are explicitly classroom examples. Browser-local
phone-photo tours, extended validated metadata and IndexedDB media are documented
in [photo tours](photo-tours.md). Role controls navigation only. Real authentication,
contact, shared publication and backend persistence are absent. Save uses explicit
UI actions; publish failure rolls back the new listing and media, retaining its draft.

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
paper, brand dark/lime/pink, homepage-scoped Literata headings and Source Sans 3 body/controls. Fonts are self-hosted,
with only used weights and Latin/Cyrillic/Cyrillic-extended subsets. Controls use a
1rem floor; supporting metadata uses .9375rem. Overrides inherit into our Shadow
DOM components without changing saved shared theme values. Navigation collapses
at 60rem to accommodate readable labels. Page mixes surface/base with
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
Additional map/upload/media verification and bundle sizes: [photo tour contract](photo-tours.md).

The accepted homepage hero places the interactive Three.js room first on desktop, with the headline beside it and centered room/roommate actions below. On phones the copy and actions precede the room; scene height and heading scale remain bounded. No image download or extra renderer is required.

Rooms and the map now share one navigation entry, “Өрөөнүүд.” Room results offer “Жагсаалт” and “Газрын зураг нээх”; both reuse the same filters and listings. The Rooms navigation stays current in either view.

Room browsing opens the room list first, with a map-icon tab to switch to a full-width map. Search filters are budget and a native “Нөхцөл” checkbox dropdown, shared with roommate browsing. Keyword and district search inputs are removed. Selected conditions use AND matching against known listing traits; pets use the existing pets flag. Map markers still open detail dialogs.

The search controls use a flat white band with thin horizontal rules. The native condition dropdown retains labeled checkboxes, outside-click dismissal, and Escape returning focus to its summary.

The selected view controls pair an “Өрөөнүүд” list tab with a compact map-icon tab labeled “Газрын зураг” for assistive technology and tooltips. Filters persist across both views. The map view does not render apartment cards alongside the map.

The redundant room/roommate category selector inside results is removed. The header and homepage choices navigate to those categories; the rooms list/map tabs remain.
