# Hamtry native app and separate design editor

Our own signal framework and 12 native Web Components share Hamtry CSS variables.
The component development page is `/`. The complete React showcase and theme
editor live separately at `/editor.html`. Homepage visuals are deferred.

```sh
npm install
npm run dev
```

Open `/editor.html` and choose **Edit variables**. Click **Save changes** to save edits to
`theme/hamtry-theme.json` and update other pages using the shared theme.
Stored dimensions use `rem`; generated styles scale them using the fluid `--u`
token. Layouts use relative sizing and `em` breakpoints.

```sh
npm run build
npm start
```

The built authoring server runs at `http://127.0.0.1:4173` and keeps theme edits
on disk. Node 22.18+ is required. `npm run preview` also supports the theme API.
Run `npm test` and `npm run lint` for checks.

Future pages/components load the shared theme once:

```html
<script type="module" src="/hamtry-theme.js"></script>
```

Import the local library through its public entry point:

```js
import { registerComponents, applyDefaultTheme, signal, $ } from '@hamtry/library'

applyDefaultTheme()
registerComponents()
```

This alias resolves to `src/library/index.js`; it is not a published npm package.
All twelve native components use open Shadow DOM and shared design tokens.

- [Human guides (Mongolian)](../../docs/human/README.md): architecture, class/lifecycle lessons, state, component examples, and theme usage.
- [Agent guides](../../docs/agents/README.md): file ownership, API contracts, and validation workflow.

Consume variables such as `var(--brand-primary)` and `var(--spacing-4)` inside
component styles, including Shadow DOM. See [the design system documentation](src/library/design-system/README.md)
for token names, component inventory, persistence configuration, and Figma status.

JavaScript ES modules live in `src/library` and `src/app`; the independent editor
uses JSX in `src/editor`. Theme routes and the built server live in `server`.

See [the folder guide](../../docs/human/folder-structure.md) and
[the UX/UI and Three.js roadmap](../../docs/human/roadmap.md) for the next steps.
