# Public API contract

Import browser APIs from `@hamtry/library`. The barrel is explicit; add new public
exports there intentionally. Do not assume compatibility with React, Svelte, or
jQuery APIs based on similar names.

## Reactivity and ownership

| API | Contract |
| --- | --- |
| `signal(initial)` | `.get()` tracks synchronous reads; `.set(value \| updater)` updates immediately and schedules dependent effects |
| `useState(initial)` | Returns `[getter, setter]`; no lazy initializer or hook-index protocol; call getter to read current value |
| `useEffect(callback)` | Initial synchronous run; auto dependency tracking; callback returns void or synchronous cleanup; no dependency array |
| `untrack(callback)` | Temporarily disables read tracking, restores previous observer even on errors |
| `Scope.run(callback)` | Installs synchronous resource ownership, restores previous owner on exit |
| `Scope.add(cleanup)` | Registers owned cleanup; disposed scopes reject additions |
| `Scope.dispose()` | Idempotent; reverse cleanup order; attempts all cleanups and aggregates failures |
| `onCleanup(fn)` | Requires active scope; cleanup is synchronous |
| `onMount(fn)` | Immediately runs during scoped setup; returned cleanup belongs to scope; reruns on reconnect setup |
| `flushEffects()` | Explicit test synchronization; normal execution schedules a microtask automatically |

Equality uses `Object.is`; mutation of an existing object does not notify.
Functional setters execute without read tracking. Function-valued state is set
through an updater returning the desired function. Effects replace dependencies
each run; reads after `await` are not tracked. Multiple writes batch through a
Set queue. Writes from an effect can schedule additional rounds; more than 100
rounds is a cycle error. Errors are surfaced, not silently suppressed.

Returned cleanup runs before rerun and on disposal. Nested effects/resources are
owned by a fresh scope for each outer effect run. Standalone effects need their
returned disposer called by the consumer. Component-owned effects clean up on
disconnection. Use `AbortController`/generation handling in the consuming page
for asynchronous work; the engine does not implement async effect tracking.

## Owned motion

`createMotion()` is a public, scoped API. Call it synchronously inside component
`setup()` or `Scope.run()`. It imports only `animejs/waapi` and exposes:

- `play(element, { opacity, transform }, { duration = 240, delay = 0, ease = 'cubic-bezier(.16,1,.3,1)', onComplete })`:
  a finite native-WAAPI animation, with at most one owned animation per element.
- `stop(element)`: cancels the prior animation without firing its completion.
- `reduced`: whether reduced motion is requested or the document is hidden.

Use complete CSS `transform` strings, not Anime.js individual transform aliases.
Completion and cancellation restore the animated inline properties without
resetting unrelated geometry styles. Preference changes and hidden tabs settle
pending UI callbacks; disposal cancels them without late UI changes. Reduced
motion skips animation and applies the final state immediately. There is no
continuous application animation loop, global target selector, or persistent
`will-change`. Capture old bounds in one batch, change layout once, then animate
surface/icon transforms; do not tween layout properties on scroll.

## Element base, DOM and styles

`HamtryElement` creates an open shadow root with `delegatesFocus: true`.
Subclass fields hold per-instance state. Implement `render()` for stable
DOM once and `setup()` for each connection's effects/listeners. The base
owns a scope and disposes it on disconnect. State/DOM persist on reconnect.
Lifecycle callbacks are browser-driven. Do not override them unless preserving
base ownership behavior deliberately.

`static observedAttributes` controls browser attribute callbacks.
`attributesChanged.get()` inside an effect subscribes to those updates.
DOM updates normally batch in a microtask. Form field value/checked properties
also synchronize their connected native control and form state immediately.

| Helper | Contract |
| --- | --- |
| `$(selector, root=document)` | Plain array of all matches; no chaining, no shadow piercing |
| `query(selector, root=document)` | First match or null |
| `required(selector, root)` | First match or actionable error; root required |
| `on(target, name, handler, options?)` | Returns manual listener disposer |
| `listen(...)` | Same subscription with active-scope cleanup; use in synchronous setup |
| `bindText(node, getter)` | Owned effect writing `textContent`; returns disposer |
| `emit(target, name, detail)` | Dispatches bubbling, composed CustomEvent; returns dispatch result |
| `applyComponentStyles(shadowRoot)` | Sets the root's adopted sheets to the shared component sheet; append custom sheets afterwards |
| `applyDefaultTheme()` | Returns existing/new default style; idempotent per document; prepends so saved theme wins |

Theme exports: `themeTokens`, `themeCss`, and `emptyOverrides`.
These are JavaScript values/functions; the library has no type-only exports. `applyDefaultTheme` does not load fonts, poll, or save. The app
loads `src/styles/base.css` and `/hamtry-theme.js` separately.

## Components and public state

`registerComponents()` registers all 14 elements, skipping existing names.
Instances expose native events and the contracts below. Attribute names do not
automatically become JS properties. Boolean attributes use presence semantics.

| Tag | Main configuration | Writable public properties / events |
| --- | --- | --- |
| `hamtry-button` | variant: primary/secondary/outline/ghost/destructive; size: sm/md/lg; type: button/submit/reset; aria-label | disabled, loading; native click |
| `hamtry-input` | label/name/type/value/required/disabled/readonly/placeholder/helper/error; native constraints | value, disabled; input, composed change |
| `hamtry-textarea` | Field attributes appropriate to textarea | value, disabled; input, composed change |
| `hamtry-select` | Field attributes, option/optgroup children | value, disabled; input, composed change |
| `hamtry-checkbox` | label/name/value/checked/required/disabled | checked, value, disabled; input, composed change |
| `hamtry-radio` | Choice attributes; grouped by form/root/name | checked, value, disabled; input, change; arrow navigation |
| `hamtry-switch` | Choice attributes; native checkbox with switch role | checked, value, disabled; input, composed change |
| `hamtry-badge` | tone: neutral/info/success/warning/error; slotted text | No extra state |
| `hamtry-alert` | tone/heading/dismissible; slotted content | hamtry-dismiss detail `{}`; hidden on dismiss |
| `hamtry-tabs` | selected attribute; direct panel children with label | numeric selected; hamtry-tab-change `{ selected }` |
| `hamtry-roommate-card` | heading/image/image-alt/location/price/description/saved; slotted extras | saved; hamtry-save `{ saved }` |
| `hamtry-property-card` | Same card API, different image proportions | saved; hamtry-save `{ saved }` |
| `hamtry-chip` | selected/disabled presence attributes, slotted label | selected; hamtry-toggle `{ selected }`; focus() |
| `hamtry-dialog` | heading attribute, slotted content | open readonly; showModal(), close(value=""); hamtry-dialog-close `{ value }` |

Form controls use `ElementInternals` for `FormData`, validity, reset, state
restore, and disabled fieldsets. Fields expose form, validity, validationMessage,
checkValidity(), reportValidity(), focus(). Default value/checked attributes
are distinct from current value/checked properties. No-option select value
normalizes to empty. Reset uses current default attributes/defaultSelected.
Named radios have a single selection and roving tab stop; disabled radios are
excluded from keyboard navigation. Radio keyboard selection emits composed
change; do not assume that custom keyboard handling also emits native input.

Button submission uses the enclosing form's requestSubmit(); reset uses reset().
The consuming page may cancel the bubbling click with preventDefault(). Named
submitter name/value serialization is not part of the current button API.
Inputs support Enter submission; textarea Enter remains a newline.

Tabs use ArrowLeft/Right, Home/End and clamp selected index. Direct child list
changes rebuild the tabs. Label-only attribute mutation is not observed.
Cards toggle local state and emit intent; they do not persist listings.

Chip toggles native button aria-pressed and emits selection. Disabled prevents toggle.
Dialog uses native top-layer/focus/Escape, closes on backdrop/close button and emits
its returnValue. Programmatic close() also emits the native close event; consumers
should guard route changes. Dialog content is slotted light DOM. The panel enters
in 220ms and exits in 130ms; reduced motion is immediate. `.open` is logically
false during exit, and `showModal()` can cancel an unfinished close. Native
focus return and the close event occur when the actual dialog closes.

Exposed parts: button, control, badge, alert, card, media (card image wrapper), image (card image), content (card body), summary (compact card text), dialog. Page code should consume host
APIs/events rather than private shadow selectors. Test-only shadow inspection is
appropriate. Always render untrusted text via textContent/properties.

Listing cards expose a named `heading` slot, with the heading attribute as its
fallback. App title links may be slotted there without nesting the save control
inside a link. `part="image"` supports scoped image hover/press feedback.

`hamtry-move-in-picker` is an app component with ISO `min` and `value` attributes.
A missing/invalid minimum uses today's local date. Values below minimum clamp to
minimum; user selection emits `hamtry-date-change` with `{ value: 'YYYY-MM-DD' }`.
`close()` hides its popover, including when an inline card collapses.
The calendar uses a native popover, restores trigger focus on selection, supports
arrow-key day/month crossing and roving focus, and closes on Escape/outside-click,
resize or page scroll. Listeners and motion are released with its component scope.

## Shared UI tokens

`src/library/design-system/tokens.css` imports `ui-tokens.css`. This layer contains
fixed-rem `--ui-space-*` and `--ui-radius-*` values, semantic `--ui-shadow-*`, page
surfaces/borders/muted text, and the shared `:root[data-appearance="dark"]` palette.
The existing generated fluid `--spacing-*`/`--radius-*` tokens are unchanged;
fixed UI values preserve the authored component geometry when replacing literals.
App and app-component CSS inherit these through base.css, including Shadow DOM.
Do not redeclare the dark palette in page CSS. Change shared values here rather
than duplicating literals. Unique layout widths, aspect ratios and breakpoints
remain structural constants. `tests/ui-tokens.test.js` guards unresolved UI token
references across all app stylesheets. React/chart code is unchanged by this work.
