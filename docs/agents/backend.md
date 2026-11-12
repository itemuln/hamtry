# Hono backend contract

Authoritative source: `Back-End/api/src`, plain SQL migrations under
`Back-End/api/migrations`. Runtime: the existing Cloudflare `hamtry` Worker,
imported by `Front-End/client/server/worker.js`, with DB=D1 and PHOTOS=R2.
No ORM or TypeScript. See `Back-End/api/README.md` for routes, migrations and checks.

The Worker keeps existing theme write/editor/actuator protections. `/api/v1`,
`/api/auth` and authenticated liveness route to Hono; assets stay same-origin.
Remote AUTH_SECRET is a Worker secret. Cloudflare connector provisioning does
not authenticate the local Wrangler CLI. CI installs both package lockfiles and
runs checks before deploying. SQL migrations must be applied separately first.

Frontend `state/api.js` is the transport boundary; components/framework have no
API/auth dependency. `state.backend`, `user`, `catalog`, `remoteSaved`, `detail`
and pagination signals integrate with the existing native page. Deep links load
the individual listing. API failure/offline retains clearly labelled browser demo
behavior. Existing localStorage drafts are preserved; login never bulk imports
or overwrites them. Authenticated saving/publication uses the API. Logout clears
account-specific in-memory state. Private endpoints are never service-worker cached.

Browser tests use local, disposable synthetic accounts only. No local fixtures,
credentials or developer secret should be copied into production auth. Production
classroom seeds have explicit demo flags and cannot sign in. R2 remains private;
photo access is mediated by publication status or owner sessions.
