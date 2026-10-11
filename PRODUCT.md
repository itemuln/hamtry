# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: people in Ulaanbaatar looking for a room or roommate. Secondary:
room providers preparing and presenting a room listing. Confirmed by the user
on 2026-10-11.

## Product Purpose

Hamtry helps people explore and choose a room and compatible roommate.
The current application is an Advanced Web App classroom prototype.

## Operating Context

Mongolian web interface used on desktop and mobile browsers. Existing journeys
cover filtering, viewing details and phone-photo tours, saving choices, and
preparing browser-local room listings. Explore adds an illustrative Ulaanbaatar
world: choose a destination, travel by car, enter through a door, and use furniture
to open room, roommate and saved-choice views.

## Capabilities and Constraints

- Use the project's own signal framework and native Web Components whenever practical.
- Three.js is mandatory for the interactive world; performance and UX are priorities.
- Native app code is JavaScript ES modules. The React editor is a separate surface.
- Shared design tokens and reusable controls exist; the user permits changing colors
  and component appearance for this experience.
- All listing/profile examples are classroom fixtures. Saved selections, demo role,
  and provider listings are browser-local. Real accounts, contact, publication,
  booking and payments are not connected.
- City buildings and roads are illustrative, not exact geography or actual venues.
- A live marketplace backend and its authorization contracts remain open decisions.

## Brand Commitments

Hamtry name; Mongolian product language; rooms and shared living as the product context.
The user wants an unconventional spatial web experience, including a character
driving through Ulaanbaatar, doors for navigation and lamps for lighting.

## Evidence on Hand

- `Front-End/client/src/library/`: native framework, components and design tokens.
- `Front-End/client/src/app/pages/home.js`: existing marketplace prototype.
- `Front-End/client/src/app/data/listings.js`: explicitly illustrative fixtures.
- `Front-End/client/explore.html`: interactive Three.js prototype.
- `docs/human/` and `docs/agents/`: implemented architecture and behavior contracts.

## Product Principles

- Let spatial interaction serve a clear task.
- Reuse the native framework and shared components.
- Keep core actions available through accessible HTML controls.
- Bound loading and GPU work, especially on mobile.
- Distinguish example content and browser-local persistence from real service claims.
