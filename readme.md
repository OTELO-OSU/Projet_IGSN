# IGSN Project

A pnpm workspace monorepo for managing IGSN (International Generic Sample Number) records.

## Packages

| Package                                                | Stack             | Dev port | Description                                          |
| ------------------------------------------------------ | ----------------- | -------- | ---------------------------------------------------- |
| [`@projet-igsn/domain`](packages/domain)               | TypeScript        | -        | Shared business logic and contracts; no I/O          |
| [`@projet-igsn/design-system`](packages/design-system) | React 19 + shadcn | -        | Shared UI components, styles, and shadcn config      |
| [`@projet-igsn/frontend`](packages/frontend)           | React 19 + Vite   | 3000     | Public app for unauthenticated users (browse/search) |
| [`@projet-igsn/admin`](packages/admin)                 | React 19 + Vite   | 3001     | App for authenticated users and admins               |
| [`@projet-igsn/api`](packages/api)                     | Hono + Node       | 3002     | Backend API; holds all business domain logic         |

## Requirements

- Node `24` (see [.nvmrc](.nvmrc))
- pnpm `11.7` (pinned via `packageManager` in [package.json](package.json))
- Docker (for `make dev`)

Tooling is shared across packages from the workspace root: [oxlint](https://oxc.rs) for
linting, [oxfmt](https://oxc.rs) for formatting, [Vitest](https://vitest.dev) (browser mode)
for tests, and Husky git hooks. Dependency versions are centralized in the pnpm
[catalog](pnpm-workspace.yaml).

## Devcontainer

A [devcontainer](.devcontainer) gives every contributor the same clean, reproducible
environment: Node, pnpm, Playwright browsers, Docker-in-Docker, and the oxc VS Code
extension are all preinstalled, so nothing touches your host machine. Open the project
in it (VS Code: "Reopen in Container") and the [Setup](#setup) steps below already ran
via `postCreateCommand`. Ports 3000-3002 are forwarded automatically.

### Desktop (desktop-lite)

The [desktop-lite](https://github.com/devcontainers/features/tree/main/src/desktop-lite)
feature runs a lightweight Linux desktop (Fluxbox) inside the container, reachable in your
browser over noVNC. Use it to view headed Playwright runs or any GUI app.

Open http://localhost:6080 (default password `vscode`). The port is forwarded automatically
via the `appPort` entry in [devcontainer.json](.devcontainer/devcontainer.json).

## Setup

```sh
make install            # pnpm install
make install-browsers   # pnpm install + playwright browsers (required for tests)
```

## Develop

Run every package together in Docker with live file watching:

```sh
make dev
```

This builds and starts `admin` (http://localhost:3001) and `api` (http://localhost:3002)
via [docker-compose.dev.yml](docker-compose.dev.yml). Source changes sync into the
containers automatically.

## Design system

All shadcn/ui components live in [`@projet-igsn/design-system`](packages/design-system),
which also owns the shadcn config ([components.json](packages/design-system/components.json))
and the shared theme ([src/styles.css](packages/design-system/src/styles.css)). Apps
consume them from there, for example:

```tsx
import { Button } from "@projet-igsn/design-system/components/ui/button";
```

shadcn components MUST be added in the `design-system` package, never in an app. Add
them with the workspace `shadcn` script, which runs the CLI inside `design-system`:

```sh
pnpm shadcn add <component>   # e.g. pnpm shadcn add dialog
```

## Auth (Keycloak)

`make dev` starts a preconfigured Keycloak plus mock SAML/ORCID IdPs, so brokered login
works offline with no external accounts. See [docs/dev-authentication.md](docs/dev-authentication.md).

## Test

Tests run in a real browser through Vitest + Playwright, so run `make install-browsers`
first.

```sh
make test           # pnpm test           one-shot, headless
make test-browser   # pnpm test:browser   headed browser UI
make test-watch     # pnpm test:watch     re-run on change, headless
```

### End-to-end (auth)

[`e2e/`](e2e) drives a real browser through the full brokered login flows
(institution/Shibboleth and ORCID) with [`@playwright/test`](https://playwright.dev);
selectors and actions live in page objects under [`e2e/support/`](e2e/support).

Each target brings up its own throwaway **prod-mode** stack from
[`docker-compose.e2e.yml`](docker-compose.e2e.yml) — the apps' prod Dockerfile
stages (built, not `vite dev`), a real Postgres with a one-off migration, and
Keycloak + the mock IdPs — runs the tests, and tears it down:

```sh
make test-e2e        # headless, one-shot
make test-e2e-ui     # Playwright UI mode, then open http://localhost:8090
```

It uses a separate compose project (`igsn-e2e`) on shifted ports (frontend 4000,
admin 4001, api 4002, keycloak 18080, saml-idp 18081), so it runs **in parallel
with `make dev`**. The port-specific auth URLs are env-substituted into the realm
import, so the same realm files serve both environments.

## Lint and format

```sh
make lint            # pnpm lint:apply + fmt:apply   fix in place
pnpm lint:check      # oxlint                        report only
pnpm fmt:check       # oxfmt --check                 report only
```

Linting and formatting also run automatically on commit via the Husky pre-commit hook.

## Make targets

Run `make help` (or just `make`) to list every available target.
