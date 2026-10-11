# Custom Framework Architecture Rules

## Context
- Start with [docs/agents/README.md](docs/agents/README.md) for current architecture, public APIs, and validation.
- **Framework:** Our own signal engine (`signal.get()`, `signal.set()`, `useState`, `useEffect`) and native Web Component classes. Do not add a React or Svelte runtime to the native library. React remains in the separate editor at `/editor.html`.
- **Styling:** Custom design system. Do NOT use default Tailwind classes or DaisyUI unless explicitly mapped to our design tokens.
- **3D Workflow:** Native `three` package managed via vanilla lifecycle methods (`onMount` with returned cleanup, or `onCleanup`).

## Code Structure Rules
- Use JavaScript ES modules (`.js`); the separate React editor uses `.jsx`. Do not add TypeScript or TS configuration.
- Keep library core/design system/components under `src/library`, native pages under `src/app`, editor under `src/editor`, and theme authoring routes under `server`.
- Components must be native vanilla JS functions or classes returning DOM elements.
- State uses our `signal.get()` / `signal.set()` or `useState` getter/setter API. `useEffect` tracks synchronous reads automatically; it has no React-style dependency array.
- Use `@hamtry/library` for page imports. `$` is our DOM query-all helper, not a Svelte auto-subscription. See the agent API contract before changing it.
- Explain library code in Mongolian comments. Keep human guides in `docs/human` and agent handoff contracts in `docs/agents` synchronized with behavior changes.
- 3D Canvas element lifecycle must be tied to component initialization and properly disposed of on destruction to prevent WebGL memory leaks.
