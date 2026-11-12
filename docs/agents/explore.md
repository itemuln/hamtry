# Explore entry and immersive map

`/explore.html` opens the shared `hamtry-home` shell at `#map`. The ordinary
homepage (`/`, `#rooms`) remains the room listing view; `#roommates`, `#saved`,
and `#dashboard` retain their existing behavior. The 3D navigation link selects
`#map` inside the same shell, preserving the header and guided search.

`hamtry-immersive-map` embeds `HamtryImmersiveExplore` beneath that header,
without its standalone sidebar/header. `listings` supplies validated filtered
coordinates; `selectedId` updates marker selection. It fills the remaining
viewport, exposes 3D/2D controls, and links previews to the
existing listing dialog. Initialization waits until the map becomes visible.
`#list` is an explicit room-list route. The classic procedural city is no longer
linked or selected by the Explore entry. No React/Swift runtime is added.

Reference: https://github.com/artembobkin/ImmersiveMap (MIT, Swift 6 + Metal,
Apple platforms only). This is a web adaptation of its globe/city/marker journey,
not the ImmersiveMap engine or a Swift port. No upstream source/assets are bundled.

The existing lazy `map-renderer.js` / MapLibre dependency provides OpenFreeMap
basemap, markers and attribution. A separate OpenFreeMap building vector source
is extruded using `render_height` / `render_min_height` at zoom 14+. Missing height
falls back to 6m for display; these heights are map metadata, not survey evidence.

Controls: 3D and 2D select the map mode. Room previews retain scoped Anime.js WAAPI entry (240ms) and exit (130ms), with reduced-motion handling.
Room buttons and markers share a preview with a link to the homepage detail route.
Fixtures and validated browser-local room publications are included; people without
coordinates are not placed on the map. Selecting a room preserves the current map mode.
Reduced motion skips camera flights. Map tile failures retain the keyboard-accessible
room list. A delayed-load message appears after 12 seconds. WebGL and remote tile
availability are required for map rendering; no API key or paid service was added.

Ownership: cleanup is installed before dynamic import; disconnected pages cannot
create maps. ResizeObserver, message timer, listeners, markers and MapLibre renderer
are removed on disconnect. MapLibre renders on demand; no independent RAF loop.
OpenStreetMap/OpenMapTiles/OpenFreeMap attribution remains visible in the map control.

Verified in Chromium: Ulaanbaatar building extrusion, globe switching, room selection
and preview link; lint/build pass. Mobile hardware, Safari/Firefox, terrain elevation,
custom landmark models and native ImmersiveMap features have not been accepted.

# Archived procedural-city implementation notes

- `/explore.html?view=classic` → `src/app/explore.js` → native `hamtry-explore`.
- Page: `src/app/pages/explore.js`, `explore.css`; renderer: `components/explore-scene.js`.
- Page uses HamtryElement, signals, owned listeners/effects, and existing button,
  switch, select, dialog, property-card and roommate-card components. No new runtime.
- Local warm palette is scoped to the Explore host; no saved theme file writes.
- Hashes `#city/{cafe,home,gallery}` and `#inside/{cafe,home,gallery}` support deep
  links and browser Back. Unknown hashes restore city/cafe.
- Choose a place → short car trip → arrival → entrance → interior. The trip can
  be skipped, cancelled with Escape, or replaced by choosing another destination.
  Reduced motion enters directly. Doors return to the city; lamps change lighting.
- Projected HTML labels and the control deck duplicate scene actions for keyboard
  and touch. Dialog uses the library's native focus trap/Escape/return focus.
- Café menu opens roommate fixtures; sofa/gallery art open room fixtures; bookshelf
  opens saved fixtures. Same `createAppState` store as `/`; explicit heart actions
  persist browser-local choices. Desk links to the existing provider dashboard,
  saving the local provider role only when the user follows that link.
- This is an illustrative neighbourhood, not real geography, cafés or addresses.
  There is no real user authentication, contact or shared listing backend here.

## GPU and lifecycle

Lazy renderer import begins on intersection. Cancellation is registered before
the import; disconnected instances cannot create a renderer. Reconnect replaces
the lost/disposed canvas and installs a new renderer with retained page signals.

Static and interactive geometry is batched by parent, material and action. There
are no model downloads, HDR environments, postprocessing or continuous idle
animations. Frame scheduling runs only during a trip; camera/UI updates draw on
demand. Trips suspend when the document or component is hidden. Shadow maps are
updated on scene changes, not camera-only changes.

Automatic mode caps pixel ratio at 1.5; canvases below 680 logical pixels or
Save-Data use 1 and disable shadows. Explicit low is 1/no shadows; high caps at 2.
Resize reapplies quality. One 1024² directional shadow map, low-segment geometry.
Disconnect cancels frames, disposes controls, marker/pointer listeners, textures,
geometries, materials, shadows and renderer, then loses the WebGL context.
Initialization errors release partial resources. Context loss retains HTML actions.

## Acceptance

Run the repository checks. Verify city/inside deep links, travel/skip/change
destination, Escape, Back, door/lamp, card save → shelf → homepage persistence,
settings, 320/390/768/1440 layout, low-quality mode, idle frame stability, removal
and reconnect, and fallback after context loss. Do not infer real-phone GPU
performance, Safari support or production acceptance from desktop browser checks.
# Impeccable Live development

The project-local Impeccable skill is in `.agents/skills/impeccable` at the
repository root. Run its launcher from `Front-End/client` with
`live --target explore.html`; use the Vite development page, not the built
preview. `DESIGN.md`, `.impeccable/design.json`, and `.impeccable/live/config.json`
in the client are the confirmed design record, component previews, and injection
configuration. The product record remains at the repository root.

Live requires an actively serviced `live-poll` in the same chat. Its picker
currently resolves Explore's Shadow DOM children to the `hamtry-explore` host;
use page Steer or direct scoped source edits for internal elements. Do not move
the native page out of Shadow DOM merely to satisfy this tool limitation.
Stop with `live-server stop`, which removes temporary HTML injections before a
production build. Runtime journals and helper state are gitignored. Never commit
the injected helper script or its token.

The embedded map exposes focusListing(id) during its connected lifecycle. It
queues a requested listing until map loading finishes, then selects its marker,
opens its preview and flies to the stored coordinates in the current mode. Reduced motion uses
a zero-duration camera move. The method is released on disconnect.

The flat mode is now “2D · Дагуул”: full-color Esri World Imagery raster tiles,
with Esri/imagery-provider attribution, no saturation filter and no building
extrusion. The raster layer is visible only in flat mode. Room selection and
embedded fit retain satellite mode. Imagery is fetched only when visible and
requires connectivity; room lists remain usable on tile failure.

3D city uses the light vector basemap with a theme `surface-base` background,
opaque, vertically shaded buildings and warm directional lighting. Unlisted
buildings use `border-default`, and listed buildings use `brand-primary`. These are extruded
map footprints, not photogrammetry or satellite-textured building facades.

Map toolbar is limited to 3D and 2D.
Custom landmark facade work was reverted. Vector ground and shaded standard
extrusions remain; there is no globe or separate building toggle in this toolbar.

`components/listing-buildings.js` matches filtered listing coordinates against
loaded OpenFreeMap building Polygon/MultiPolygon footprints, excluding holes and
`hide_3d` features. All loaded footprints become separate GeoJSON features;
only containing footprints receive brand-primary colour;
unmatched coordinates retain markers without inventing a building association.
Duplicate tile geometries are collapsed; multiple listings share a footprint.
Merged MultiPolygon features are split into individual polygons before matching,
so unrelated buildings in the same vector feature keep their original colour.
Every building can be hovered independently, including buildings without listings.
Map hover uses the polygon feature id; marker hover/focus and selection use listing
ids. Both emphasize the relevant building with brand-accent-lime.
Feature-state colour interpolation lasts 180ms, retargets from the current value,
and settles immediately for reduced motion. No height distortion or idle RAF loop.
Click/tap opens the existing listing preview for listed buildings; unlisted
buildings do not invent a listing or open an empty preview. Markers retain keyboard access.
2D hides the building layer. Source/move listeners, theme listeners and pending
frames are released before the owned MapLibre instance is removed.
