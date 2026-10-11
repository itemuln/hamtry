# Next implementation plan

This is planned work, not implemented behavior. See the [human UX roadmap](../human/roadmap.md).

## Current foundation

JavaScript ES modules throughout native runtime, app, tests, theme server and
Vite config; JSX only in the separate React editor. No TypeScript source or
compiler scripts. Folder ownership is documented in [architecture](architecture.md).
Twelve native components and the framework are available. Homepage, navigation,
search, Three scenes, account APIs and marketplace persistence remain unimplemented.

## Ordered deliverables

1. Define seeker/provider journeys, page map, Mongolian CTA copy, wireframes and
   state inventory. Use the existing design tokens; inspect the relevant design
   reference when choosing visuals. Do not invent verified listings or user counts.
2. Implement `src/app/pages/home.js` and app-specific header/hero/search/listing
   compositions. Move the component demo to a separate development page when
   homepage becomes `/`; keep its build input and docs synchronized. Editor stays
   at `/editor.html`. Reuse native controls via `@hamtry/library`.
3. Implement a native app `hamtry-hero-scene` using raw `three`. Install it only
   when implementing the scene. Avoid React/Svelte/3D wrapper dependencies. Keep
   scene controls in our signals; render HTML actions outside the decorative
   canvas. Lazy loading, bounded rendering resolution, resize handling, hidden/
   offscreen pause, reduced motion and WebGL failure fallback are acceptance criteria.
4. Complete one local search/filter/detail/save flow before adding provider listing
   and dashboard flows. Keep fixtures identifiable; connect authenticated backend
   operations only after inspecting actual API/session/role contracts.
5. Verify responsive layout, keyboard/focus, error/empty/loading states, motion and
   scene lifecycle, then update human guides and API contracts with actual behavior.

## Placement and boundaries

App-specific compositions belong in `src/app/components/`; pages in `src/app/pages/`.
General reusable controls belong in `src/library/components/`. The design system
is the styling authority. Introduce an app scene module beside its component if
it improves readability; avoid speculative graphics abstractions and empty folders.
Do not add a router, new hooks or packages without a concrete consumer need.

Three initialization may be async, but scope ownership is synchronous. Register
cleanup and cancellation/generation handling before awaiting a dynamic import.
Ignore or dispose late-created resources after disconnect. Reconnect must create
fresh rendering resources without duplicate loops/listeners. Dispose only owned
resources, including textures and render targets when used. See the linked official
sources in the human roadmap before implementing the selected Three version.

## Definition of done for the next homepage slice

- Primary search actions are understandable and usable on mobile and desktop.
- Real HTML content remains usable if the decorative scene fails or motion is reduced.
- Design tokens drive component/UI appearance; editor draft/Save behavior remains intact.
- No runtime errors, missing images, horizontal overflow or duplicate reconnect handlers.
- JS tests, lint and build pass; browser results state the devices/browsers exercised.
- No claimed backend persistence, publication or deployment based only on local checks.
