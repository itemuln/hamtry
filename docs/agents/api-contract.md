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

`registerComponents()` registers all 12 elements, skipping existing names.
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

Exposed parts: button, control, badge, alert, card. Page code should consume host
APIs/events rather than private shadow selectors. Test-only shadow inspection is
appropriate. Always render untrusted text via textContent/properties.
