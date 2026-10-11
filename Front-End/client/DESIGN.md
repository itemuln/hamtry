---
name: Hamtry Explore
description: A small city, a shared home — calm, warm, playful
colors:
  pine: "#294b40"
  pine-hover: "#1f3c33"
  pine-pressed: "#183128"
  cream: "#f4efe6"
  paper: "#fffcf7"
  interactive: "#ebe8de"
  secondary-text: "#626d63"
  border: "#cbd2c5"
  terracotta: "#b66041"
  clay-label: "#a05c42"
  soft-green: "#e2eadf"
  lime: "#d5e4bc"
  pink: "#e7b09a"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 3.8vw, 4.2rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0.06em"
rounded:
  md: "0.5rem"
  place: "0.8rem"
  panel: "1rem"
  pill: "2rem"
spacing:
  small: "0.5rem"
  medium: "1rem"
  large: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.pine}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    height: "2.75rem"
    padding: "0 1.1rem"
  button-primary-hover:
    backgroundColor: "{colors.pine-hover}"
    textColor: "{colors.paper}"
  button-outline:
    textColor: "{colors.pine}"
    rounded: "{rounded.md}"
    height: "2.75rem"
    padding: "0 1rem"
  destination-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.pine}"
    rounded: "{rounded.panel}"
    padding: "1.4rem 1.5rem"
---

# Design System: Hamtry Explore

## Overview

**Creative North Star: "A small city, a shared home"**

Calm, warm and playful, confirmed by the user on 2026-10-11. The Three.js
world provides the spatial character; the HTML interface uses quiet surfaces,
clear text and approachable rounded controls. The user's confirmed preference
is flatter depth and restrained controls. Existing diffuse overlay shadows are
recorded as implementation evidence, not a mandate to amplify elevation.

This record describes the Explore surface and its use of the shared native
component library. Explore's host-scoped palette overrides the shared theme.
It does not replace the separately saved homepage/editor palette. Source truth:
`src/app/explore.css`, `src/library/design-system/components.css`, and
`src/library/design-system/theme.js`.

**Key Characteristics:**
- A spatial artifact with a restrained HTML interface.
- Warm cream surfaces, pine actions, and a terracotta headline accent.
- Rounded controls and subtle borders, with flat depth preferred.
- Mongolian copy and visible keyboard controls alongside scene interactions.

## Colors

### Primary

Pine carries primary actions, selected markers and main text. Hover and pressed
variants retain the same hue. Colors above are extracted from Explore's host
custom properties; the frontmatter is normative for this surface.

### Secondary

Terracotta emphasizes part of the large headline. The darker clay label color
serves smaller destination metadata. Lime and pink are supporting accents.

### Neutral

Cream is the page ground; paper lifts readable overlays. Secondary text and
borders provide quiet hierarchy. Interactive and soft-green surfaces indicate
hover and selection.

**The Scope Rule.** Apply this palette inside Explore; preserve the user's saved
shared theme and other page scopes.

## Typography

Explore uses Inter for display and body. The shared library also supplies
Manrope for dialog headings and homepage display text. Preserve that existing
role distinction rather than replacing either font during Live edits.

The display scales fluidly; smaller breakpoints use the observed 2.4rem and
2rem headline sizes. Body copy keeps generous line height. Destination titles
use the title role; labels support scanning rather than competing with the world.

## Layout

The desktop shell is capped at 110rem with fluid side gutters. The world is a
relative container: introductory text sits at the upper left, scene controls at
the upper right and destination details at the lower right. A three-column
place selector follows the world.

At 65em, secondary navigation and descriptive copy reduce. At 42em, the canvas
occupies a 28rem zone, destination details join normal document flow, furniture
controls wrap, and content cards become one column. These Explore breakpoints
are distinct from the shared theme's 64em and 40em token breakpoints.

## Elevation & Depth

The user prefers flatter depth. Borders and surface tones should carry HTML
hierarchy. Existing overlays have low-opacity diffuse shadows: destination
`0 .5rem 2rem #294b400a`, markers `0 .2rem .8rem #294b4012`, and journey
`0 .3rem 2rem #294b4015`. Shared listing cards and dialogs retain their tokenized
shadows. These are observed values, not a request for additional shadows.

The world itself uses an orthographic camera and real lighting. Keep spatial
depth in the scene; keep ordinary controls restrained. Idle rendering is
on demand and reduced motion skips the car journey.

## Shapes

Shared fields use the medium radius; destination panels use the panel radius.
Primary travel controls and markers are pills. Place cards use the place radius.
Thin borders distinguish interactive regions; selection also changes surface
and text color. Preserve visible focus outlines and touch-sized hit areas.

## Components

### Buttons

Native `hamtry-button` supports primary, secondary, outline, ghost and destructive
variants, plus sizes and loading/disabled states. Explore's main travel action
uses the primary pill treatment. Secondary furniture actions use outline.
Use the existing component API and inherited tokens.

### Inputs / Fields

Native input, select and switch components provide labels and real interactive
controls. Fields use thin borders, rounded corners, paper backgrounds and pine
focus styling. Error and disabled styles come from the shared design system.

### Navigation

The wordmark returns to the homepage. Desktop links are quiet text; secondary
navigation disappears at narrower widths. Keep the settings entry visible.
Door actions have matching HTML controls; they are navigation with clear labels.

### Chips / Markers

Place markers are pill controls with a small pointer. Pine denotes selection;
paper denotes the default state. Markers are projected from world positions,
while the lower selector provides an equivalent keyboard path.

### Cards / Containers

Destination panels provide a title, concise description and one primary action.
Shared property and roommate cards retain their image, title, price and save
controls. Native dialogs manage focus and Escape; preserve these behaviors.

## Do's and Don'ts

### Do:
- **Do** keep scene actions available through labeled HTML controls.
- **Do** use native components and preserve keyboard focus and reduced motion.
- **Do** prefer flatter depth and restrained controls, as the user requested.
- **Do** preserve Explore's palette scope and the separate saved shared theme.

### Don't:
- **Don't** turn this surface's palette into an unapproved site-wide theme change.
- **Don't** replace native control behavior with canvas-only interactions.
- **Don't** add permanent decorative animation or continuous idle rendering.

### Homepage typography refinement

The homepage uses locally hosted Literata (600/700) for headings and Source Sans 3
(400/600/700) for body text and controls, in Latin, Cyrillic and Cyrillic-extended
subsets. This page-scoped choice follows the Live request to replace the repeated
font treatment and enlarge functional text. It does not replace the Explore type
system documented above. Controls and body-small use 1rem, ordinary body uses
1.125rem, and supporting metadata uses .9375rem. Display headings retain the
existing responsive range up to 6rem with -.025em tracking. Existing icon sizes
and responsive heading endpoints are deliberate homepage roles; the detector
compares them against the Explore-only frontmatter ramp and reports advisories.
