# Hamtry design system

React showcase with shared CSS variables for Hamtry and the future custom
Web Component library.

```sh
npm install
npm run dev
```

Open the preview and choose **Edit variables**. Click **Save changes** to save edits to
`theme/hamtry-theme.json` and update other pages using the shared theme.
Dimensions use `rem`; layouts use relative sizing and `em` breakpoints.

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

Consume variables such as `var(--brand-primary)` and `var(--spacing-4)` inside
component styles, including Shadow DOM. See [the design system documentation](src/design-system/README.md)
for token names, component inventory, persistence configuration, and Figma status.
