# Deployment contract

See [VPS deployment assets and setup](../../infrastructure/production/README.md).

Pushes to `main` run `.github/workflows/deploy-production.yml`. Frontend lint,
tests and build plus Java 21 Maven verification with a PostgreSQL service must
pass before upload. The release contains built Vite pages, the dependency-free
Node server and its theme source/JSON import, backend JAR, and a seed theme.

NGINX → Node 24 on 127.0.0.1:4173 serves built pages and theme reads.
NGINX → Spring on 127.0.0.1:8082 serves backend routes and health.
PostgreSQL is isolated on 127.0.0.1:5435. The production Spring profile requires
external DB credentials and validates schema. There are currently no product
backend APIs. `/api/theme` is routed before general `/api/`.

Public theme writes are denied; `/editor.html` is hidden. SSH-tunneled loopback
access preserves the local editor's explicit Save behavior. Persistent theme
state is seeded once and survives deployments; browser-local marketplace data
is still a prototype. No production authentication has been introduced.

The root release script validates frozen checksummed artifacts, rejects archive
links/traversal, atomically switches release links, restarts both services, and
rolls back failed activation. Credentials, database data, Node runtime and saved
theme are outside code releases. Runtime acceptance needs live VPS checks.
