# Hamtry Hono API

Hono + Cloudflare Workers, D1/SQLite prepared statements, Better Auth native D1
adapter, and R2. Application data access uses plain SQL. No ORM is configured.

## Local development

```sh
npm ci --prefix Back-End/api
cd Front-End/client
npm ci
npm run api:migrate
npm run dev
```

The dev launcher starts/reuses the existing Python service, initializes local D1,
starts/reuses Hono at 8787, then serves Vite at 5173. `.dev.vars` is generated with
a local-only secret if absent and is ignored by Git. Do not reuse it in production.
`npm run api:dev` starts only Hono. Local resources are separate from production.

## Routes

- `GET/POST /api/v1/chats`: list or open a conversation.
- `GET/POST /api/v1/chats/:id/messages`: read or send messages as a participant.

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

Migration 0002 archives the former `demo=1` classroom records. No examples are
seeded or used as frontend fallbacks; real accounts and listings are preserved.
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

## API documentation and languages

Open `/api/docs` for the route index and `/api/openapi.json` for the OpenAPI 3.1
document. REST remains at `/api/v1`. Query published listings with
`POST /api/graphql` and a body such as:

```json
{"query":"{ listings(limit: 5) { data { id title price } pagination { nextCursor } } }"}
```

Set `Accept-Language: en` for English or `Accept-Language: mn` for Mongolian.
Mongolian is the default. HTTP failures return `error.code` and
`error.message`, and validation errors can include `error.fields`.
GraphQL execution failures use `errors[].extensions.code`.

## Module and provider boundaries

The existing Worker deploys one Hono application. Profiles, saved listings,
moderation, listings, media and verification register their routes separately.
The REST and GraphQL catalog reads receive the same repository through
`createApi({ catalog })`. An alternate implementation must support
`search(filters)` and `get(id)` with the same visibility and pagination behavior.
Listings has a REST controller, a transport-independent service, and a D1
repository covering reads and writes. The other feature modules and identity
still use D1 directly. A database migration also needs to cover those features.

Keep payment gateway code at the outbound boundary once a provider and payment
flow are chosen. Verify webhooks before applying events and enforce database
uniqueness on the provider and event identifier. Keep public versioned assets
in a separate bucket from private uploads when introducing an R2 asset origin.
Deploy schema expansions before dependent code and defer removals until rollback
no longer needs them.

The API emits request duration in `Server-Timing`. Benchmark by feature before
choosing a split. Favor a module with measurable independent scaling or failure
isolation needs. Keep its public route in Hono and use a private Service Binding
after it gets its own deployment.

## Coding conventions

Put validation shared by controllers or transports, common limits, and error
handling in `src/utils/`. Keep feature rules in services and SQL in repositories.
Use named constants for limits shared by validation, storage, and documentation.

Route handlers return errors with `problem`. Services and validators throw
`ApiError` with a stable `ERROR` code when a request cannot continue. Add any new
user-facing message in both languages in `src/utils/errors.js`. Keep raw
exception text in server logs instead of including it in an API response.

Keep JavaScript and comments within 120 characters per line. ESLint enforces
this limit in API source and tests. Break long SQL statements at clause
boundaries and keep values bound through prepared statements.

### Feature layout and review

Group code by feature. Use Listings as the reference: the controller handles HTTP,
the service owns business operations, the repository owns SQL, and the schema file
owns feature validation. Cross-feature imports use the module's `index.js`. A
small feature can stay in one file until separating responsibilities helps.
ESLint enforces the public import boundary for Listings.

Use kebab-case filenames, camelCase functions and variables, PascalCase classes,
and UPPER_SNAKE_CASE constants. Name functions after the operation they perform.
Use comments to explain constraints and tradeoffs. Put broad formatting changes
in a separate review from behavior changes when practical.

Run `npm run format` to format source and tests. CI checks formatting, lint, and
tests. Use service tests for business rules, local D1 integration tests for SQL
and persistence, and request tests for REST and GraphQL contracts.
