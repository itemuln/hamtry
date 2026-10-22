# Hamtry VPS deployment

Target: https://hamtry.srv1869478.hstgr.cloud on the shared KoreaBox/HiLiving VPS.

## Architecture

The native JavaScript/Web Component site and separate React editor are built by
Vite. The Node server serves the built pages and the theme bundled with the release.
Spring Boot 4.1.1 / Java 21 is currently a JPA/PostgreSQL scaffold, with no
marketplace controllers, accounts, or authentication. Browser-local listings,
photos and demo data remain browser-local after deployment.

The public frontend runs on Cloudflare Workers. On the VPS, NGINX terminates
HTTPS and routes ML requests directly to the dedicated loopback Python service.
The existing VPS frontend and Spring scaffold remain available for maintenance.

| Component | Runtime | Persistent state |
| --- | --- | --- |
| Frontend and theme reads | `hamtry-frontend`, port 4173 | Theme versioned with each release |
| Selfie check | `hamtry-liveness`, Python/ONNX on port 8001 | DeepFace models in `/var/lib/hamtry/liveness` |
| Spring backend | `hamtry-backend`, port 8082 | PostgreSQL |
| PostgreSQL 17 | Compose project `hamtry`, loopback port 5435 | `hamtry-postgres-data` Docker volume |

Releases live under `/opt/hamtry/{frontend,backend}/releases/<SHA>` and `current`
is an atomic symlink. Secrets live in `/etc/hamtry/hamtry.env`, mode 0640,
root:hamtry. Node 24 is isolated under `/opt/hamtry/runtime/node` and does not
replace another application's runtime. Existing KoreaBox/HiLiving files and
services are outside this deployment's paths.

The public site allows theme reads but denies writes, and hides `/editor.html`.
The Node server also rejects theme writes, including over loopback. Author with
the local editor, commit `Front-End/client/theme/hamtry-theme.json`, and deploy.
Each release includes that file; old overrides in `/var/lib/hamtry/theme` are
retained for recovery but no longer used. Code rollback restores the release's
theme. Production uses JPA `validate`, not automatic schema mutation. Add an
explicit migration strategy before creating entities. Code rollback does not
roll back the database.

## One-time server setup

Clone the repository into a root-controlled staging directory. Commands below
run on the VPS from `infrastructure/production` in that checkout. Verify that
4173, 8001, 8082 and 5435 are free first;
if different ports are chosen, align the environment file, Compose and NGINX.
Java 21, Docker/Compose, NGINX, curl, OpenSSL, Certbot and xz must be installed.
Python 3 with `venv` support and outbound HTTPS are required for selfie checks.
The initializer and release deploy install pinned Python packages. The first launch downloads
DeepFace weights to `/var/lib/hamtry/liveness` and may take several minutes;
deployment waits for the model load to finish.

1. Run `sudo ./install-node-runtime.sh`. Downloads the pinned official Node 24
   archive and verifies its recorded SHA-256 before extraction.
2. Run `sudo ./initialize-server.sh hamtry.srv1869478.hstgr.cloud`. Creates the
   isolated runtime user, directories, random DB credentials and service units.
   Existing environment files are retained. Units are enabled but not started.
3. Start the database:

   ```sh
   sudo docker compose -p hamtry --env-file /etc/hamtry/hamtry.env -f /opt/hamtry/operations/postgres.compose.yaml up -d --wait
   ```

4. Render `nginx-bootstrap.conf.template`, replacing `__SERVER_NAME__` with the
   target hostname, into `/etc/nginx/sites-available/hamtry`; link it into
   `sites-enabled`. Test `sudo nginx -t`, then reload NGINX. The bootstrap site
   serves ACME challenges and returns 503 for other paths.
5. Confirm DNS points to the VPS and issue the certificate with
   `sudo certbot certonly --webroot -w /var/www/certbot -d hamtry.srv1869478.hstgr.cloud`.
   The owner completes any certificate subscriber agreement/email prompts.
6. Render `nginx.conf.template` with the same hostname, `__BACKEND_PORT__=8082`
   and `__FRONTEND_PORT__=4173`; replace only the Hamtry site. Test and reload
   NGINX. Set a Certbot deploy hook to test and reload NGINX after renewal.
7. Generate a dedicated Ed25519 deployment key outside the repository. Run
   `sudo ./install-deploy-automation.sh <public-key-file>` to install its public
   key for `hamtry-deploy` and grant only `/usr/local/sbin/hamtry-deploy <SHA>`
   through sudo. The installer preserves existing SSH allowlists, adds Hamtry
   when an allowlist exists, and enforces key-only SSH for this account. The private key is stored only locally and in GitHub secrets.

## GitHub Actions configuration

Frontend pushes to `main` deploy to Cloudflare using `deploy-cloudflare.yml`.
The previous `.github/workflows/deploy-production.yml` is manual-only for VPS
maintenance. In the repository's `production` environment set:

| Setting | Value |
| --- | --- |
| Variable `PRODUCTION_URL` | `https://hamtry.srv1869478.hstgr.cloud` (also the workflow default) |
| Secret `VPS_HOST` | verified VPS address |
| Secret `VPS_PORT` | SSH port, normally 22 |
| Secret `VPS_SSH_PRIVATE_KEY` | dedicated Hamtry deployment private key |
| Secret `VPS_SSH_KNOWN_HOSTS` | host-key entry verified against the VPS console; include `[host]:port` for a non-default port |

No credentials belong in Git. Keep deployment permissions restricted to trusted
`main` writers. GitHub environment protection settings may require approval;
configure them according to the owner's intended automatic push behavior.

Each run installs locked frontend dependencies, runs lint/tests/build, verifies
the backend against a temporary PostgreSQL service, creates checksummed release
artifacts and uploads through pinned SSH. The root deployment script copies
uploads into a private staging directory, checks filenames/checksums/archive
paths and types, then starts and health-checks the backend and frontend before
verifying public HTTPS. Deployment is serialized in Actions and on the VPS.
On failure it restores both prior links and restarts their services; a failed
first deployment removes the first links and stops the new services. Successful
retries of an active SHA are idempotent. Old releases are retained for recovery.

## Validation

### Standalone VPS ML service

For a Cloudflare frontend with VPS inference, run as an administrator from a
reviewed checkout:

```sh
sudo bash infrastructure/production/install-ml-service.sh Back-End/liveness
```

This installs Python venv support if missing and the pinned API dependencies
in `/opt/hamtry/ml/.venv`, then enables `hamtry-liveness.service` as user `hamtry`.
One Uvicorn worker owns the in-memory sessions and inference lock. The API binds
only to `127.0.0.1:8001`, uses ONNX, and stores model weights under
`/var/lib/hamtry/liveness`. A 2 GiB memory limit and two-CPU quota bound resource
use on the shared VPS; confirm these limits against real inference on deployment.

After model startup passes the local health check, the installer backs up the
Hamtry NGINX site and adds or replaces `/api/liveness/` routing directly to ML.
It validates and reloads NGINX, restoring the config on failure. It does not
change SSH, database configuration, or other applications' sites.
The Cloudflare Worker already proxies this path to the VPS HTTPS origin.

Verify health, session creation, invalid-image rejection and session replay
rejection through the VPS and Cloudflare origins. Startup and session creation
do not prove successful real-camera verification.

Verified on 2026-10-22: the dedicated service loaded RetinaFace, Fasnet and SFace;
health and session endpoints worked through both public origins. Invalid JSON
schema, malformed images, reused sessions, over-limit bodies and a synthetic
blank JPEG were rejected with the expected statuses. The blank-image test reached
the real face detector. Real-camera acceptance remains a separate manual check.

### Existing VPS release checks

From the repository root:

```sh
docker run --rm -v "$PWD:/repo:ro" rhysd/actionlint:latest /repo/.github/workflows/deploy-production.yml
docker run --rm --entrypoint shellcheck -v "$PWD/infrastructure:/scripts:ro" koalaman/shellcheck-alpine:stable /scripts/production/deploy-release.sh /scripts/production/initialize-server.sh /scripts/production/install-node-runtime.sh /scripts/production/install-deploy-automation.sh /scripts/tests/test-deploy.sh
docker run --rm -v "$PWD/infrastructure:/work:ro" ubuntu:24.04 bash /work/tests/test-deploy.sh
```

The deployment regression test uses mocked service/HTTP commands inside a
throwaway Linux container. It exercises first release, repeated SHA, rollback,
persistent theme, corrupt checksum and archive symlink rejection. It does not
prove actual systemd, NGINX, certificates or live VPS acceptance.

After installation, verify HTTPS homepage, component page, saved theme JSON/CSS,
`/actuator/health` reporting `UP`, public theme PUT returning 403, editor returning
404, service restart and a failed-release rollback. Check KoreaBox and HiLiving
still respond normally. Database backups and restore testing are separate
operational work. A local build or a mocked rollback is not a live deployment.
