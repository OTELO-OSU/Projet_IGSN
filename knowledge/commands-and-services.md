---
type: reference
title: Commands and dev services
description: >-
  The makefile wraps the pnpm monorepo; dev runs the stack over
  docker-compose.dev.yml behind one Caddy origin on port 3000.
resource: makefile
tags:
  - reference
  - commands
  - dev
relations:
  - type: depends_on
    target: package-layering
status: stable
---

pnpm monorepo, packages in `packages/`, wrapped by the `makefile`: `make install`, `make dev`, `make lint`, `make test`.

Prefer `pnpm <script>`, so files and args can be appended:

- `pnpm test` runs the suite headless (`test:browser` interactive, `test:watch` watch); `pnpm test path/to/file` narrows to a file, `pnpm test --project @projet-igsn/<project>` to one project.
- `pnpm lint:apply` / `lint:check`, `pnpm fmt:apply` / `fmt:check`.
- `pnpm -F @projet-igsn/api migrate` applies migrations.
- `pnpm --filter @projet-igsn/domain sync-institutions` regenerates the institution catalogs ([[sync-institutions-import]]).

Stack commands:

- `make dev` runs the stack via `docker-compose.dev.yml` (watch plus build).
- `make test-e2e` stands up a throwaway prod stack, runs the Playwright e2e, and tears it down.
- `make db-seed-demo` re-seeds the demo data; `make db-import-legacy` loads the legacy dump into a throwaway database and imports it ([[legacy-import]]).
- `make preprod-deploy` deploys preprod ([[preprod-infrastructure]]).

Dev services: one origin, http://localhost:3000, with `frontend` at `/`, `admin` at `/admin` and `api` at `/api` ([[single-origin-routing]]); `keycloak` http://localhost:8080; `maildev` UI http://localhost:1080.

A full `pnpm test` run can flake under contention with iframe or port errors that vanish per project, so rerun by project before treating one as real. The pre-commit hook type-checks the whole repo.
