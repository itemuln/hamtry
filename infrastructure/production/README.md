# Hamtry VPS deployment

Target: https://hamtry.srv1869478.hstgr.cloud on the shared KoreaBox/HiLiving VPS.

## Architecture

The native JavaScript/Web Component site and separate React editor are built by
Vite. The Node authoring server serves the built pages and saved theme reads.
Spring Boot 4.1.1 / Java 21 is currently a JPA/PostgreSQL scaffold, with no
marketplace controllers, accounts, or authentication. Browser-local listings,
photos and demo data remain browser-local after deployment.

NGINX terminates HTTPS and routes requests to two loopback services:

| Component | Runtime | Persistent state |
| --- | --- | --- |
| Frontend and theme reads | `hamtry-frontend`, port 4173 | `/var/lib/hamtry/theme/hamtry-theme.json` |
| Spring backend | `hamtry-backend`, port 8082 | PostgreSQL |
| PostgreSQL 17 | Compose project `hamtry`, loopback port 5435 | `hamtry-postgres-data` Docker volume |

Releases live under `/opt/hamtry/{frontend,backend}/releases/<SHA>` and `current`
is an atomic symlink. Secrets live in `/etc/hamtry/hamtry.env`, mode 0640,
root:hamtry. Node 24 is isolated under `/opt/hamtry/runtime/node` and does not
replace another application's runtime. Existing KoreaBox/HiLiving files and
services are outside this deployment's paths.

The public site allows theme reads but denies writes, and hides `/editor.html`.
The editor has no production authentication. Continue authoring locally, or
use an SSH tunnel to the loopback Node server for authenticated administrator
access through SSH. The seed theme is installed only when the persistent file
is absent; later deploys preserve it. Production uses JPA `validate`, not
automatic schema mutation. Add an explicit migration strategy before creating
entities. Code rollback does not roll back the database or saved theme.

## One-time server setup

Copy this directory to a root-controlled staging directory. Commands below run
on the VPS from that directory. Verify that 4173, 8082 and 5435 are free first;
if different ports are chosen, align the environment file, Compose and NGINX.
Java 21, Docker/Compose, NGINX, curl, OpenSSL, Certbot and xz must be installed.

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

The workflow `.github/workflows/deploy-production.yml` runs on pushes to `main`
and manual dispatch. In the repository's `production` environment set:

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
