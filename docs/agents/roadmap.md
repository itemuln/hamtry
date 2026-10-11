# Next implementation plan

Implemented homepage/search/detail/save/local-provider/Three slice is documented
in [homepage contract](homepage.md). Fourteen controls, JS-only native runtime,
separate React editor and three HTML entries exist. Do not rebuild that foundation.

1. Validate the current UX with people on mobile; fix demonstrated confusion in
   search labels, details, saved choices and publish preview. Check Safari/Firefox
   and physical low-end-device performance; current checks use Chromium.
2. Inspect real Spring session/role/listing/save endpoints and data contracts before
   integrating. Define loading/error/retry and privacy for real requests. Local role
   and storage are examples, never authorization or backend persistence.
3. Complete real provider fields/upload/preview/save/edit/delete as a single flow;
   then roommate profile/contact consent. Keep server authority and untrusted-text
   handling explicit. Do not fabricate verified users, counts or tour availability.
4. Refine visuals using actual floorplans/3D assets only when available. Measure the
   current lazy ~565 kB Three chunk/GPU cost on target hardware before expanding.
   Preserve offscreen/reduced-motion behavior, SVG fallback and reconnect cleanup.
5. Package the library only when a second app needs distribution; establish exports,
   stylesheet/font handling and version contract then. Do not introduce empty
   packages, router layers or speculative hooks without concrete consumers.

Native code remains JavaScript and raw Three.js. Use `@hamtry/library` from pages;
general controls under library/components, product compositions under app. Keep
saved theme overrides and explicit editor Save behavior. Update human and agent
contracts after actual behavior changes and distinguish local from production checks.
