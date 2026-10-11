# Three.js Explore contract

- `/explore.html` → `src/app/explore.js` → native `hamtry-explore`.
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
