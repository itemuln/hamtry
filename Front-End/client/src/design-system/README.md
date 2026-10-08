# Hamtry design system

Source: [Hamtry, Page 2](https://www.figma.com/design/LPm4B10FkuJyly7Ck2SNNM/Hamtry?node-id=13-29).

React 19 + TypeScript + plain CSS. Open the app root to browse the interactive
showcase. Run `npm run dev`, `npm run build`, and `npm run lint` from `Front-End/client`.

## Foundations

`tokens.json` records the inspected Figma values, including Desktop, Tablet, and
Mobile modes. `tokens.css` exposes the same names with slashes replaced by hyphens:
`brand/primary` → `var(--brand-primary)`. It includes 24 semantic colors,
dimension tokens, responsive layout/type tokens, 13 typography classes, and
three shadow levels. Inter 400/600/700 is bundled locally, including Cyrillic.
The theme is light because that is the supplied Hamtry semantic mode.

Import `tokens.css` once at the application root. Component styles are imported
by `components.tsx`. Use tokens instead of duplicating colors in consuming pages.
Use `.type-heading-h1`, `.type-body-md`, `.type-label-md`, etc. for typography.

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

Photos and SVGs in `assets/` are downloaded Figma source assets. Photos fill their
original slots with `object-fit: cover`; SVG intrinsic dimensions are preserved.
Marketplace card text and photos remain supplied by props. Showcase profiles,
prices, and validation are examples, with no backend or persistence.

## Figma integration status

The file already contains the native components listed above and the semantic
colors. No new Figma objects were saved: the connector rejected the attempted
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

The Figma `text/tertiary` token has 4.49:1 contrast on `surface/base`; use
`text/secondary` for small text on that background. Disabled text is reserved for
inactive controls. No dark mode is invented.

## Validation

Build and lint pass. Browser checks cover invalid/valid email submission, switch
state, arrow/End tab navigation, card save state, alert dismissal, image loading,
and no document overflow at 320, 390, 768, 1024, and 1440px. Desktop and mobile
screenshots are in the repository's `output/playwright/` directory.
