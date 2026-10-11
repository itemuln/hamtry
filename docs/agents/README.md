# Hamtry agent entry point

Read this before changing the library. These docs describe implemented behavior;
the human teaching guides are in [../human](../human/README.md).

1. [Architecture and file map](architecture.md): boundaries and authoritative files.
2. [API contract](api-contract.md): exact semantics; do not infer React/jQuery behavior.
3. [Change and validation workflow](workflow.md): safe edits, checks, browser acceptance.

## Current state

- Canonical checkout: `/Users/itemuln/Documents/2026-2027 autumn/AdvancedWebApp/hamtry`.
- Frontend working directory: `Front-End/client` within that checkout.
- App page imports use `@hamtry/library`, mapped to `src/library/index.js`.
- This is a local source library, not a published/installable npm package.
- Native library: custom signal engine, class-based Web Components, Shadow DOM,
  token-driven styles. No React/Svelte runtime dependency in native code.
- `/` is the interactive Hamtry homepage; component demo is `/components.html`.
- [Homepage contract](homepage.md) covers routes, local storage, UX and Three lifecycle.
- [Map and phone-photo tour contract](photo-tours.md) covers owner uploads and browser-local media.
- Complete React showcase/theme editor remains separately at `/editor.html`.
- Fourteen components are implemented. Navigation/search/detail/save and browser-local
  provider previews work with explicit fixtures. Real accounts/contact/marketplace APIs are absent.
- Spring backend is separate; do not infer feature APIs from its scaffold.

## Immediate rules

Preserve unrelated local changes, especially saved theme edits. Keep the design
system as the styling authority. Write explanatory library code comments in
Mongolian. Maintain both human guides and agent contracts when behavior changes.
Follow the repository's `AGENTS.MD` and any narrower instructions. Do not treat
passing local checks as production acceptance, deployment, or publication.

## Next work

- [Ordered implementation plan](roadmap.md)
