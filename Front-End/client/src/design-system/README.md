# Hamtry design system

Source: [Hamtry, Page 2](https://www.figma.com/design/LPm4B10FkuJyly7Ck2SNNM/Hamtry?node-id=13-29).

React 19 + TypeScript + plain CSS. Open the app root to browse the interactive
showcase. Run `npm run dev`, `npm run build`, and `npm run lint` from `Front-End/client`.

## Foundations

`tokens.json` records the Figma dimensions and responsive modes. Colors use the
user palette: lime `#DBF799`, pink `#FFC4C5`, and dark green `#2F371F`. `tokens.css` exposes the same names with slashes replaced by hyphens:
`brand/primary` → `var(--brand-primary)`. It includes 26 semantic colors,
dimension tokens, responsive layout/type tokens, 13 typography classes, and
three shadow levels. Inter 400/600/700 is bundled locally, including Cyrillic.
The theme is light because that is the supplied Hamtry semantic mode.

Import `tokens.css` once at the application root. Component styles are imported
by `components.tsx`. Use tokens instead of duplicating colors in consuming pages.
Use `.type-heading-h1`, `.type-body-md`, `.type-label-md`, etc. for typography.

## Editable shared theme

Click **Edit variables**. Click **Save changes** to persist edits to the authoritative
`Front-End/client/theme/hamtry-theme.json` file through `PUT /api/theme`.
The showcase loads that file through `GET /api/theme`, and other open pages
refresh within two seconds. Edits preview locally until saved; other pages keep the saved theme.
The server serializes writes and atomically replaces the file. Failed saves are
shown in the editor; click **Save changes** to retry. A failed initial load blocks editing.
Reset creates a draft that also requires **Save changes**.

`GET /hamtry-theme.css` generates the complete stylesheet from the saved theme.
The default token names stay stable for your future component library. The persisted JSON uses version 2 and dimensions
in `rem`. Figma's source numbers in `tokens.json` are design references; the token
model converts them to relative units. All application/component CSS dimensions
use relative units, with fluid grids and image aspect ratios. Breakpoints use
`em`; tablet and mobile values apply at 64em and 40em. Browser text preferences
scale `rem` values without a fixed root font size.

For live updates in any Hamtry page, load this framework-independent module
once. It obtains the same server stylesheet and updates it every two seconds.
Custom elements inherit the variables through Shadow DOM:

```html
<script type="module" src="/hamtry-theme.js"></script>
<hamtry-button>Хадгалах</hamtry-button>
```

```css
/* Inside the custom component's shadow stylesheet */
button {
  background: var(--brand-primary);
  color: var(--text-inverse);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-4);
}
```

Keep shared defaults at the app root; shadow styles consume them. Load the theme
from the same Hamtry server instead of copying values into components. For a
snapshot that only refreshes on navigation, use
`<link rel="stylesheet" href="/hamtry-theme.css">` instead of the module.
The module dispatches `hamtry-theme-change` after an update and
`hamtry-theme-error` if loading fails, retaining the last successfully loaded theme.

`npm run dev` and `npm run preview` both provide the theme routes. To serve the
built app with persistence, run `npm run build` then `npm start` (Node 22.18+;
default `127.0.0.1:4173`). `PORT` and `HOST` configure the server;
`HAMTRY_THEME_FILE` can point to a persistent absolute file path. This is a local
authoring server; a public deployment needs authenticated edit access and
persistent writable storage. A static-only host cannot save theme edits.
The editor does not sync changes to Figma.

## Components

| React export | Figma component node | Supported behavior                                                                  |
| ------------ | -------------------- | ----------------------------------------------------------------------------------- |
| Button       | 142:7491             | primary, secondary, outline, ghost, destructive; sm/md/lg; focus, disabled, loading |
| TextInput    | 142:8546             | native input props; label, helperText, error; disabled/readOnly                     |
| Textarea     | 142:8646             | native textarea props; label, helperText, error                                     |
| Select       | 142:8696             | native select/options; label, helperText, error                                     |
| Checkbox     | 142:7976             | native controlled/uncontrolled checkbox; indeterminate                              |
| Radio        | 142:8002             | native radio grouping through name                                                  |
| Switch       | 142:8028             | controlled checked/onChange; role=switch; disabled                                  |
| Badge        | 142:7956             | neutral, info, success, warning, error; non-interactive                             |
| Alert        | 142:8128             | status tone, title/content, optional dismiss action                                 |
| Tabs         | 142:8182             | controlled panels; ArrowLeft/Right, Home, End; roving focus                         |
| RoommateCard | 142:14212            | data/image props; controlled save; profile action                                   |
| PropertyCard | 142:14213            | data/image props; controlled save                                                   |

```tsx
import { Button, TextInput, Switch } from './design-system/components'

<TextInput label="И-мэйл хаяг" type="email" helperText="Таны мэдээллийг бусдад харуулахгүй." />
<Button variant="primary" onClick={save}>Хадгалах</Button>
<Switch label="Мэдэгдэл" checked={notifications} onChange={setNotifications} />
```

Fields always have labels. Errors use separate helper IDs and `aria-invalid`.
Loading buttons expose `aria-busy` and prevent repeated submissions. Selection
controls retain native keyboard behavior. Listing save buttons expose
`aria-pressed`. Essential statuses use explicit text as well as color.

Photos and SVGs in `assets/` are downloaded Figma source assets. SVG colors have
been updated for the requested palette; their paths and dimensions are preserved. Photos fill their
original slots with `object-fit: cover`; SVG intrinsic dimensions are preserved.
Marketplace card text and photos remain supplied by props. Showcase profiles,
prices, and validation are examples, with no backend or persistence.

## Figma integration status

The file already contains the native components listed above and the original
semantic colors. The new palette is applied locally; Figma still has the old colors. No new Figma objects were saved: the connector rejected the attempted
token update with `Can't call "createVariableCollection" in read-only mode`.
The visible editor and `figma.editorType` indicate Design Mode, so changing the
URL alone does not establish that the connector can write.

Remaining Figma work once write access is available:

- Add `var(--...)` WEB code syntax to the corresponding token variables.
- Restrict variable scopes by role (text, border, background, spacing, radius,
  typography, dimensions, effects).
- Alias Hamtry semantic colors to Hamtry primitives while retaining existing
  semantic IDs and values.
- Add a compact React v1 review frame using instances of the existing components.
- Register Code Connect mappings for the 12 exports above and visually validate
  the review frame. Existing wider library/navigation/workspace families are
  outside this first React inventory.

Dark green anchors primary actions and text; lime highlights brand emphasis and
compatibility; pink accents editorial surfaces and navigation hover. Supporting
neutrals and status colors match this palette. White text on the dark primary
button and dark green text on both accents exceed 4.5:1 contrast. Disabled text is reserved for
inactive controls. No dark mode is invented.

## Validation

Build and lint pass. Browser checks cover invalid/valid email submission, switch
state, arrow/End tab navigation, card save state, alert dismissal, image loading,
and no document overflow at 320, 390, 768, 1024, and 1440px. Desktop and mobile
screenshots are in the repository's `output/playwright/` directory.
Theme checks cover live color/radius updates, Shadow DOM inheritance, reload
persistence, explicit save, unsaved draft isolation, reset, and
mobile-specific type overrides without editor overflow at 390px.

Shared persistence checks also cover a separate browser context, live plain-JS
Shadow DOM consumers, rem scaling with increased root text size, disk persistence,
invalid server writes, and the built authoring server. Run `npm test` for theme
store and value validation tests.
