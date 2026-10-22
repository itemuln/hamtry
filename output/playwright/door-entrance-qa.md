# Door entrance verification — 2026-10-15

Final result: passed for the local Chromium flows listed below.

- Compared the supplied cream/blue/red reference with the rendered desktop entrance.
- Desktop 1280 × 720 and mobile 390 × 844 visually inspected; 320px width checked for horizontal overflow (none).
- Door opens to a dark choice screen; return resets it; repeated activation works.
- Enter activation with emulated reduced motion reaches the inside screen without the hinge movement.
- Light toggle updates its pressed state and action label.
- Both primary choices reach existing room / roommate listings.
- Listing detail opens and closes back to the previous browse page with focus restored.
- Listing preparation opens from inside; no listing was submitted.
- Explore inside/home → city/home door control works; no browser errors or warnings in that check.
- No browser errors observed on entrance, choices, or listing preparation.
- ESLint, 21 existing framework/model/theme tests, production build and diff whitespace check pass.
- Build retains warnings for large lazy map and Three.js chunks.
- Mechanical design detector reports palette/type/radius advisories against the Explore-oriented design ramp; the supplied homepage palette and typography are intentionally scoped and documented in DESIGN.md.

Screenshots: door-entrance-desktop.jpg, door-inside-desktop.jpg.
The floating Impeccable toolbar in captures belongs to the local development tool.

Not validated: Safari/Firefox, physical-device frame timing, full listing creation,
map filtering regression suite, backend integration, or live production. No deployment.
