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

The first viewport is `hamtry-entrance`, a native HamtryElement with a signal-owned
`door` / `inside` state. It matches the user's cream, blue and red door reference.
`hamtry-door` is a registered library component: a keyboard button, left-hinged
panel, `hamtry-door-opening` and `hamtry-door-open` events, and `reset()`.
One activation opens the panel, then fades through black over 900ms. Reduced
motion uses a 100ms state change without the hinge movement. Timers and listeners
are disposed on disconnect; the entrance makes inactive sections hidden and inert.
The inside screen starts dark, offers room and roommate links, the existing 3D
city link, and a publish button. Its light toggle changes only this screen.
Return resets the door and restores keyboard focus. The homepage no longer mounts
an additional WebGL scene, repeated intro/provider sections, avatar creation, or
a separate mock matching dataset. Browse routes still use the existing store,
shared cards, forms, dialogs, saved choices and listing fixtures.

Browse routes update synchronously without full-page View Transition snapshots.
Anime.js WAAPI provides owned, finite surface/icon transitions, search panel
entrances, and visible card reflow/reveals. Shared dialogs animate entry and exit
while preserving native focus and Escape. There is no scroll hijacking. The skip
link focuses the results region or provider dashboard.

Hash routes: `#home`, `#map`, `#rooms`, `#roommates`, `#saved`, `#dashboard`,
`#listing/<id>`. Unknown routes fall back to home. Missing detail IDs go to rooms
with feedback. Collapsing the inline detail card returns to the previous browse page;
direct detail entry defaults to the home grid. Browser Back follows hash
history. Filters are in-memory and survive same-page detail navigation, not reload.
Saved page currently applies the shared filters to both listing kinds.

Fixtures and their map coordinates are explicitly classroom examples. Browser-local
phone-photo tours, extended validated metadata and IndexedDB media are documented
in [photo tours](photo-tours.md). Role controls navigation only. Real authentication,
contact, shared publication and backend persistence are absent. Save uses explicit
UI actions; publish failure rolls back the new listing and media, retaining its draft.

## Optional app scene (not mounted by the homepage)

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

Room browsing opens the room list first, with a map-icon tab to switch to a full-width map. Search filters are budget and a native “Нөхцөл” checkbox dropdown, shared with roommate browsing. Keyword and district search inputs are removed. Selected conditions use AND matching against known listing traits; pets use the existing pets flag. Map markers open inline details in the map results panel.

The search controls use a flat white band with thin horizontal rules. The native condition dropdown retains labeled checkboxes, outside-click dismissal, and Escape returning focus to its summary.

The selected view controls pair an “Өрөөнүүд” list tab with a compact map-icon tab labeled “Газрын зураг” for assistive technology and tooltips. Filters persist across both views. The map view does not render apartment cards alongside the map.

The redundant room/roommate category selector inside results is removed. The header and homepage choices navigate to those categories; the rooms list/map tabs remain.


## Search action and roommate steps

The expanded search action displays the live match count (`4 өрөө харах` or
`3 хамтрагч харах`); the compact scrolled state retains its icon and accessible
count label. Room search follows type → district → optional conditions → budget.
Roommate search retains the type selector and only exposes conditions: district
and budget triggers are hidden, those filters are reset/ignored, and both the
conditions result action and Skip finish the search without a budget step.
Switching back to rooms restores the full flow.


## Animation ownership

`createMotion` owns native animations through the component scope. The sticky
search changes its layout once at the scroll threshold, then transforms separate
background surfaces and icons for 480ms with a gentle ease-in/out curve. Search
steps enter in 620ms with a fade and 12px rise. Switching first exits the current
panel over 220ms, then reveals the requested panel. Panels use manual popovers
so native light-dismiss cannot bypass the exit; outside pointer presses and Escape
close through the same transition, and Escape restores trigger focus. The entry starts synchronously
after positioning, before the next paint; rapid requests cancel stale transitions.
Expanded values fade
in over 240ms after a 90ms delay.
Result-count updates take 220ms. Visible
result cards enter/reflow in 240–260ms with at most 100ms total stagger. Unchanged
saved-card grids do not replay. Only the first eight cards are inspected for
motion, and offscreen cards do not animate. No map canvas animation or continuous
RAF loop was added. Reduced motion and background tabs settle immediately;
reconnect/disconnect releases active animations and preference listeners.

At widths up to 40rem, the same primary navigation becomes a fixed bottom bar
(home, map, saved), with icon/label targets, active icon emphasis and
a saved-count badge. The existing dashboard is accessible through the profile flow. Content and the
full-height map reserve its height including the device safe-area inset; toasts
sit above it. Desktop navigation remains in the header.

Room/person selection commits its route, filters and responsive search layout as
one update after the outgoing type panel exits. A cancelled selection never
commits. The next panel is measured against the updated layout before entering.
Desktop result grids use four columns above 65rem, two at intermediate widths,
and one below 34rem. The three example people occupy three of the four slots.

The header “Зар нэмэх” button replaces “Өрөө санал болгох”. It uses the primary
navy color and opens a compact anchored popover beneath it, including on mobile.
Room posting continues into the existing browser-local form; the personal
introduction option remains disabled as “Тун удахгүй”. Native outside-click and
Escape dismissal remain available. No additional bottom-tab destination or
account flow is introduced. Conditions use distinct smoke-free, pet, furniture,
Wi-Fi, cleanliness and work-from-home SVG icons with unchanged filter values.

The conditions popup contains only the six icon-based preferences; its keyword
input is removed, and form submissions explicitly use an empty query. Primary
tabs share one decorative underline/highlight that moves in 300ms; tab content
does not animate. The indicator follows responsive geometry and reduced motion.

Listing details expand the selected card inline across the result grid, with a
300ms opacity reveal (160ms fade-out before collapse) and scroll compensation to retain the selected card's
vertical position. There is no detail dialog, backdrop or focus trap. Clicking
card media/body or its title link opens it; save controls stay separate.
“Хураах” collapses it and restores link focus. Room photo tours, person portraits,
price, area/profession, move-in date, icon-based traits and sample owner identity
are shown together. Example owners are fixtures, not authenticated accounts.
Conditions omit the optional-step hint, visible fieldset legend and skip button;
the fieldset retains its accessible label and six selectable preferences.

Expanded cards use opacity only; no scale/size morph. Single-room photo labels
are suppressed in details, while multiple-room navigation remains available.
Monthly rent/budget sits below the owner row in the main text body. “Мессеж бичих”
is a non-interactive concept label. Located listings expose “Газрын зураг дээр харах”,
which switches to #map and calls the embedded map's focusListing(id); this selects
the listing and flies to its coordinates in 3D, including after a cold map load.
People without coordinates do not show a location action.

Card titles now occupy the reusable card's `heading` slot and are native detail
links; the separate “Дэлгэрэнгүй үзэх” row is removed. Title links retain keyboard
access, expanded state and focus return. Card images have a 240ms hover zoom and
a subtle pressed fade, disabled by reduced motion. The location popup no longer
contains the redundant add-room action.
A burger button between add-listing and profile opens a small header popover.
Notifications, safe living and help are disabled upcoming concepts. The working
“Харанхуй горим” switch stores light/dark in `hamtry:appearance`; startup restores
it before mounting the app. The shared dark palette applies at the app document root, including
shadow-component tokens; it does not overwrite the theme editor's saved CSS.

Expanded placement is calculated from each result's original index and current
grid column count. Its CSS order puts it at the beginning of its original row;
other cards retain their baseline order. Switching repeatedly within that row
therefore does not create additional partial rows above the expanded card.
Resize and filtering recompute placement. Collapse restores the baseline order.
Detail content keeps identity, price, location, facts and traits visible; long
descriptions show their first sentence and retain all remaining text in a native
“Дэлгэрэнгүй тайлбар” disclosure. The owner/demo copy and save label are shorter,
and the demo note follows the main actions. No source description is discarded.

Detail controls now use an icon-only primary close action, a non-interactive
message icon, money icon plus price and /сар, and a Map action. Full descriptions
are visible without a disclosure; the requested opening sentence, owner role
subtitle and demo/photo explanatory notes have been removed. Original-row
placement and opacity transitions remain unchanged.
The date fact is a `hamtry-move-in-picker` button. It opens an anchored calendar
with the listing's availability as its minimum date; earlier dates and previous
months are disabled. Month navigation, keyboard day navigation and local selection
work. Selection does not create a booking or account. Hover feedback is restricted
to enabled actions and respects reduced motion.

App styling consumes shared UI tokens rather than repeating spacing, radii,
shadows or palette values. The prior page-level dark block is removed; the
appearance switch now sets its data attribute and CSS owns color-scheme. The
dashboard message surface follows surface-elevated instead of fixed white.
Overridden duplicate declarations, retired detail selectors and the unused map
menu CSS keyframe are removed without changing animation ownership.

### Map property preview

Selecting a map marker opens an inline overlay with the listing photo, title, location, monthly price, size, available date, traits, full description and owner when supplied. The redundant listing-details link is removed. The token-styled panel scrolls within the map, enters in 380 ms and exits in 200 ms through the shared motion lifecycle; reduced motion is handled by createMotion. Closing returns focus to the marker.

Room cards use the native `compact-preview` attribute: title, location and price remain visible; hover/focus reveals supporting metadata below through a 300 ms grid-row transition. Collapsed cards align to the grid row start. Expanded detail content remains visible and interactive; no pointer-events suppression is applied.

Inline selection cancels the previous card fade before switching, fades only detail content, and clamps scroll anchoring below the sticky search dock so a selected room cannot open above the visible area.
