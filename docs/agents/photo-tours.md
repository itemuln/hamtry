# Map and linked phone-photo tour contract

Implemented first version: ordinary phone photos grouped by named room. No generated
3D geometry, 360 panorama, reconstruction service or shared/public uploads. Hero is
illustrative only. Keep native JS, our signal engine, `@hamtry/library`, tokens,
separate React editor and Mongolian explanatory comments.

## App component contracts

All extend `HamtryElement` and own open Shadow DOM. Product components stay in
`src/app/components`, not general-purpose library exports. `main.js` registers them.

- `hamtry-apartment-map`: `.listings` array `{id,title,price,location:[lng,lat]}`;
  `.selectedId` string; `.location` valid point or null. `pick-location` presence
  read on setup selects picker mode. Emits composed `hamtry-map-select {id}` and
  `hamtry-location-pick {location}`. `data-map-state`: idle/loading/ready/error.
  Uses lazy MapLibre with explicit Vite worker URL, OpenFreeMap Positron and native
  attribution. Price pins are native buttons; map labels/zoom help are Mongolian. IO starts loading; ResizeObserver
  resizes. Cleanup disposes markers/map/workers, timer and observers. Retry recreates
  renderer. Initial style-load/WebGL failure preserves cards and coordinate fields.
  First browse load fits available pins; filtered updates reuse markers and viewport.
- `hamtry-room-editor`: `.value` gives sanitized draft room metadata; `.records`
  gives prepared in-memory photo records `{id,blob,cover,caption}`; `.cover` first
  thumbnail; `.busy`; `.validate()` and `.reset()`. Maximum 6 rooms/12 total photos,
  each room named with >=1 photo. Native file inputs, JPG/PNG/WebP <=10 MB each.
  Serial preparation and pending state; late results ignored after disconnect.
- `hamtry-photo-tour`: `.rooms = [{id,name,photos:[{id,caption}]}]` resets selection
  to first room/photo. Set only when changing detail content, never on each save.
  Trusted internal fixture/draft photos can use `src`; persisted photos cannot.
  Native room buttons and previous/next, arrow keys, pressed/disabled/alt/status.
  IndexedDB Blob lookup with cancellation; object URL revoked on effect cleanup.
  `data-tour-state`: idle/loading/ready/empty/missing. Missing photo has recovery text.

## Data and ownership

`#map` added to model routes; room search leads to map. Map/cards use identical
filters and only rooms are pins. Fixture locations are examples, not verified
addresses. Old/malformed metadata without valid coordinates cannot become pins.

`hamtry-demo-v1` localStorage schema stays version 1, but published metadata now
includes `location`, `cover` (bounded JPEG data URL only), `rooms`. `parseDemo`
whitelists fields, finite Mercator coordinates (lng +-180, lat +-85), caps room/
photo IDs/counts/text and discards persisted src/blob/external URLs. 20 local
listings max. `state/media-store.js`: IndexedDB `hamtry-media-v1`, version 1,
`photos` keyPath id; entries `{id,blob}`. Photo preparation uses createImageBitmap,
1600-max JPEG .82, white alpha background and 360-max JPEG thumbnail .7. Originals
are untouched. No cross-origin or backend photo publication.

Publish validates native form + room editor, creates draft, previews using in-memory
thumbnail src. Confirm is guarded/disabled while pending: save all photos in one
IDB transaction -> update published/role -> explicit metadata persist. Metadata
failure restores state and deletes just-written photos; draft stays for retry.
Success resets form/editor/picker, clears filters, highlights the new pin and opens
map. Storage availability/quota failure must never claim a saved listing. Browser
storage is not guaranteed durable; closing during the two-store operation can leave
orphaned photos (backend lifecycle and garbage collection are later work).

Untrusted names/descriptions use textContent. Map worker and renderer load separately
from initial app and React; preserve attribution. User theme is unchanged. Avoid
adding Svelte/reactive frameworks or a fake photo-to-3D API.

## Validation and next work

Run `rtk npm test`, `rtk npm run lint`, `rtk npm run build` in client. Browser acceptance:
map ready/attribution, keyboard pin detail/Escape return, filters update pins/cards,
choose map point/manual fields, missing-room validation, multi-room file upload,
preview/edit/re-preview, confirm/reload/photo switching, local save, missing-media
and storage-quota failures, map failure/retry, mobile layout and cleanup/reconnect.
Use dedicated browser storage; never save themes against original theme JSON.

Next: inspect real Spring APIs and wire shared upload/listing/owner authorization,
image lifecycle/delete/retry and explicit precise-location publication choice. Real
3D requires guided overlapping captures and reconstruction/quality checks, then a
Three GLTF viewer. See [COLMAP](https://colmap.github.io/tutorial.html),
[Three GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html),
[MapLibre Map](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/),
[OpenFreeMap setup](https://openfreemap.org/quick_start/).

## Verified 2026-10-11

- 18 Node framework/model/theme tests, ESLint, three-entry build and diff whitespace check.
- Chromium desktop/mobile widths 320/360/390/768/1440; live map/attribution, search
  synchronizes cards/pins, keyboard pin Enter/detail/Escape return.
- PNG/JPEG upload across 2 rooms/3 photos, missing-room validation, SVG rejection,
  preview/photo navigation/edit/re-preview/confirm/new pin/reload/decoded IDB photo.
- Save preserves room/photo state; desktop map cards use the exposed media part; keyboard focus remains usable at photo bounds.
- Simulated localStorage quota: listing/state rollback, just-written Blob removed,
  draft retry succeeds. Missing IDB photo has explicit feedback.
- Simulated map style network failure: error/card fallback and functional Retry;
  remove/reconnect cleans old canvas/controller and recreates the map. Simulated
  unavailable WebGL: list/detail and manual coordinates + photo preview still work.
- Production preview map/worker and keyboard pin verified; separate editor opens
  showcase/variable panel without Save; native component demo still renders.

Browser upload checks use existing sample assets, not actual apartment imagery. Map
style emits three upstream highway-shield filter warnings about null values; live
map renders. Forced network failure produces expected console request errors.
Build warns about lazy Three (~565 kB / 141 kB gzip) and MapLibre renderer
(~1134 kB / 296 kB gzip), plus separate ~508 kB worker. These are not initial app
bundles. Safari/Firefox, physical low-end devices, backend and deployed acceptance
are unverified. Screenshots are under repo-root `output/playwright/`. Theme file,
editor code and explicit Save authority were preserved; no push or deploy.
