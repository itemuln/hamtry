# Deployment contract

Pushes to `main` run `.github/workflows/deploy-cloudflare.yml`: Node 24 installs
locked dependencies, then runs frontend lint, tests, build and Wrangler.
The public frontend is https://hamtry.23b1num3285.workers.dev.
`Front-End/client/wrangler.jsonc` owns the Worker and static-assets configuration.
The encrypted repository secret `CLOUDFLARE_API_TOKEN` grants deployment access
to the configured account; never put its value in source or logs.

`server/worker.js` serves built Vite pages and read-only `/api/theme` and
`/hamtry-theme.css` using committed `theme/hamtry-theme.json`. Save themes locally,
then deploy through Git. Public theme PUT returns 403; editor aliases and Spring
actuator routes return 404. `/healthz` checks only the web Worker, not ML inference.
Unknown API routes return 404 rather than HTML.

The Python DeepFace/TensorFlow selfie service still runs on the VPS. The Worker
proxies `/api/liveness/*` to fixed `LIVENESS_ORIGIN`, preserves response status,
limits request bodies to 1.6 MB and does not forward browser credentials.
Session state remains in that service. Do not shut down the VPS while this
dependency remains. Migrating inference requires a compatible runtime and cost
review. The separate Spring/PostgreSQL scaffold also remains on the VPS and has
no product APIs. Browser-local marketplace data remains a prototype.

The previous `.github/workflows/deploy-production.yml` is manual-only for VPS
maintenance. Existing VPS services, data and hostname remain available.
See [VPS setup](../../infrastructure/production/README.md) for those assets.
Cloudflare has no custom domain configured; the Hostinger hostname has not been
repointed.

Local checks from `Front-End/client`: `npm test`, `npm run lint`, `npm run build`,
`npx wrangler deploy --dry-run`. `npm run preview:cloudflare` runs the Worker
locally. Live acceptance needs public route checks and a selfie session request;
real camera/identity verification requires human QA.

Migration audit on 2026-10-22: the existing VPS selfie session endpoint returned
404 before migration. The previous VPS run `39712636294` failed during transfer
with an SSH connection timeout (exit 255). Cloudflare frontend deployment does
not repair that existing inference outage. Its workflow reports the endpoint's
availability separately from successful frontend deployment.
