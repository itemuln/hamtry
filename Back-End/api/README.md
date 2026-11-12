# Hamtry Hono API

Hono + Cloudflare Workers, D1/SQLite prepared statements, Better Auth native D1
adapter, and R2. Application data access uses plain SQL. No ORM is configured.

## Local development

```sh
npm ci --prefix Back-End/api
cd Front-End/client
npm ci
npm run api:migrate
# Optional classroom examples, not real users:
npx wrangler d1 execute hamtry-db-local --local --config wrangler.local.jsonc --file ../../Back-End/api/seeds/demo.sql
npm run dev
```

The dev launcher starts/reuses the existing Python service, initializes local D1,
starts/reuses Hono at 8787, then serves Vite at 5173. `.dev.vars` is generated with
a local-only secret if absent and is ignored by Git. Do not reuse it in production.
`npm run api:dev` starts only Hono. Local resources are separate from production.

## Routes

- `/api/auth/*`: Better Auth email/password registration, sign-in, sessions, logout.
- `GET /api/v1/health`: database readiness and configured auth/media capabilities.
- `GET /api/v1/listings`: kind, district, maxPrice, q, comma-separated condition
  codes, bbox=west,south,east,north, limit<=100 and opaque cursor.
- `GET /api/v1/listings/:id`: published listing with gallery URLs.
- `POST /api/v1/listings`: create an owned draft.
- `PUT /api/v1/listings/:id`: owner editing returns the listing to draft.
- `POST /api/v1/listings/:id/rooms`: create/rename a draft room by position.
- `POST /api/v1/listings/:id/photos`: multipart roomId, position, caption,
  detail/card/map files. Validate binary signature/dimensions and byte limits.
- `POST /api/v1/listings/:id/publish`: publish only a complete gallery.
- `DELETE /api/v1/listings/:id`: archive; public listing/photo access ends.
- `GET /api/v1/media/:id`: public published photo, or authenticated owner draft.
- `DELETE /api/v1/media/:id`: remove a draft photo and all variants.
- `GET/PATCH /api/v1/me`, `GET /api/v1/me/listings`.
- `GET /api/v1/saved`, `PUT/DELETE /api/v1/saved/:id`.
- `POST /api/v1/reports`, `GET /api/v1/admin/reports`,
  `POST /api/v1/admin/listings/:id/archive`: administrative moderation.
- `/api/liveness/health`: existing Python service readiness.
- `/api/liveness/sessions` and `/verify`: authenticated sessions, user-bound and
  single-use. Only the server records outcomes. Selfie frames are not stored in D1/R2.

All writes require an allowed Origin and authenticated ownership where applicable.
Client role/status/owner fields cannot override permissions. Auth sessions use
HttpOnly cookies. Auth rate limits are database-backed. APIs and photos are no-store;
the frontend service worker does not cache them. Request IDs correlate errors;
request bodies, passwords and selfie frames are not logged by application code.

## Database and publication

SQL in `migrations/` is the schema authority. Never edit an applied migration;
add a numbered SQL migration. Fresh production resources: `hamtry-db` in APAC
and the private `hamtry-photos` bucket. IDs/bindings live in the existing client
Wrangler config. `AUTH_SECRET` is a remote Worker secret, never committed.

Apply migrations before deploying code that depends on them. With authorized
Wrangler access: `npx wrangler d1 migrations apply hamtry-db --remote` from the
client directory. The Cloudflare connector can also apply reviewed SQL and record
its name in `d1_migrations`. CI does not silently migrate production databases.

R2 object writes precede the D1 photo batch; failed metadata saves delete newly
written objects. Replacing images deletes superseded objects after commit. D1
constraints enforce relational ownership, unique variants, money/status bounds,
and the 12-photo limit. Archival retains owner data for recovery; permanent
retention/garbage collection policy is future work.

The seven classroom examples have `demo=1`, synthetic users without credentials,
and existing fixture images. No verification or account ownership is fabricated.
Browser-local drafts are not automatically uploaded or overwritten by login.
Publishing is explicit, and retry reuses the same server draft.

## Checks and remaining scope

`npm test` and `npm run lint` in this package. `npm run test:integration` requires
an explicitly local Worker at 8787 and creates disposable local accounts. It checks
authentication, cross-owner denial, publication, R2 media, saved items and CSRF;
its cleanup never runs against remote D1. Frontend checks remain in client.

Email delivery, email verification/password-recovery messages, real-camera/server
acceptance and authenticated document/chat features are not implemented here.
Self-introduction posting remains upcoming in the UI, as requested; the backend
listing model supports both listing types. Admin roles are set by trusted database
administration only, not signup or profile edits. Local SQLite/PostgreSQL/Spring
scaffolds are not production API dependencies.
