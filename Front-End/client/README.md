# Hamtry native app and separate design editor

Our own JavaScript signal framework and 14 native Web Components share Hamtry CSS variables.
The interactive homepage is `/`: raw Three.js apartment, search, filters, details,
saved choices and browser-local room-posting previews. Example data is labeled;
real accounts/contact/backend persistence are not connected.
Component development is `/components.html`. The complete React showcase and theme
editor live separately at `/editor.html`.

`/explore.html` is the native Three.js city/furniture experience: select a destination,
travel by car, enter through a door, and open Hamtry fixture selections through
furniture. Accessible HTML controls mirror scene interactions. See the
[Explore guide](../../docs/human/explore.md) and [renderer contract](../../docs/agents/explore.md).

```sh
npm install
npm run dev
```

`npm run dev` starts the local selfie backend on port 8001, waits for its models,
then starts Vite. If the backend is already ready, it reuses that server.
Ctrl+C stops only servers started by this command. Open `/#dashboard` for Selfie check.

### Selfie backend setup

The existing local `.venv` and `.models` are reused. On a fresh checkout, run from
the repository root (Python 3.11 required):

```sh
python3.11 -m venv Back-End/liveness/.venv
Back-End/liveness/.venv/bin/python -m pip install -r Back-End/liveness/requirements.txt
cd Back-End/liveness
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8001
```

The first backend startup downloads DeepFace models into `.models`; let it finish,
then stop it with Ctrl+C and use `npm run dev` from `Front-End/client`.
The backend checks three JPEG images for one live face, front/turn/front movement,
and matching faces. Images stay in memory. Sessions expire after 180 seconds and
are single-use. This local demo does not verify account ownership or prevent
replay of a previously recorded sequence; it must not grant production privileges.
Camera access needs localhost or HTTPS. `npm start` serves the built frontend;
for that command, run the Python backend separately with the command above.

Open `/editor.html` and choose **Edit variables**. Click **Save changes** to save edits to
`theme/hamtry-theme.json` and update other pages using the shared theme.
Stored dimensions use `rem`; generated styles scale them using the fluid `--u`
token. Layouts use relative sizing and `em` breakpoints.

```sh
npm run build
npm start
```

The built server runs at `http://127.0.0.1:4173` and reads the theme committed
with the release; theme writes are disabled. Edit with `npm run dev` or
`npm run preview`, then commit the theme file and deploy. Node 22.18+ is required.
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
All fourteen native components use open Shadow DOM and shared design tokens.

- [Human guides (Mongolian)](../../docs/human/README.md): architecture, class/lifecycle lessons, state, component examples, and theme usage.
- [Agent guides](../../docs/agents/README.md): file ownership, API contracts, and validation workflow.
- [Homepage and scene guide](../../docs/human/homepage.md): UX routes, class/signals, local data, and GPU cleanup.

Consume variables such as `var(--brand-primary)` and `var(--spacing-4)` inside
component styles, including Shadow DOM. See [the design system documentation](src/library/design-system/README.md)
for token names, component inventory, persistence configuration, and Figma status.

JavaScript ES modules live in `src/library` and `src/app`; the independent editor
uses JSX in `src/editor`. Theme routes and the built server live in `server`.

See [the folder guide](../../docs/human/folder-structure.md) and
[the UX/UI and Three.js roadmap](../../docs/human/roadmap.md) for the next steps.

## Provider documents and contract PDFs

The local `hamtry-navbar` component switches between `#dashboard`,
`#dashboard/documents`, and `#dashboard/chat`. The documents section accepts
`.docx` only (up to 20 MB), checks the OOXML package, and stores documents and
edited versions in IndexedDB in the current browser.

The editor uses the free `@docx-editor.dev/react` and `@docx-editor.dev/core`
packages. PDF download serializes the **current editor state** to DOCX,
uses `docx-preview` to render self-contained HTML (embedded images/fonts as
base64), and posts that HTML to `/api/documents/pdf`. The Node route uses
Puppeteer to print the sanitized HTML, returning `application/pdf`. It disables
page JavaScript and blocks network/file requests during rendering. Neither the
source nor the generated PDF is written to disk by this route.

The PDF route is available in Vite dev/preview and the Node production server.
A Chromium/Chrome installation is required on the Node host:

```sh
npm install
npx puppeteer browsers install chrome
npm run dev
```

Set `PUPPETEER_EXECUTABLE_PATH` to use a managed Chrome installation. An existing
Linux Chrome in Puppeteer's standard cache can also be reused. Chromium's system
libraries and sandbox must be available to the server user. A static-only host
must proxy `/api/documents/pdf` to this Node service; the route does not run in a
plain Cloudflare Worker.

The uploaded contract stays in this browser; clearing browser storage removes
it. PDF generation transmits the rendered contract to the same-origin Node
service only. Comments, collaborative editing, signatures, and paid editor
modules are not enabled.
## Hono API / D1 / R2

Backend setup and API contract: [Back-End/api/README.md](../../Back-End/api/README.md).
Install both package dependencies before building: `npm ci --prefix ../../Back-End/api` from this directory, then `npm ci`.
`npm run dev` starts/reuses the local Hono Worker alongside the existing Python service and Vite. The local Worker uses `wrangler.local.jsonc`; production uses the existing `wrangler.jsonc`. Local secrets are generated in ignored `.dev.vars`. Use `npm run api:migrate` to initialize local D1, and `npm run api:test` for backend unit tests.
