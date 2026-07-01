# IGSN Project

## Domain

A registry assigning unique **IGSN** identifiers to **geological samples**
(physical samples of the solid Earth), making them discoverable and reusable by
researchers worldwide, including from campaigns that can no longer be run.

**In scope:** physical samples of the solid Earth, future samples.
**Out of scope:** other domains (fauna, flora, archaeology...), past samples.

- **IGSN** (International Generic Sample Number): standardized international code
  that uniquely and durably identifies a sample.
- **Sub-sample**: part of a sample transformed for analysis (broken, powdered,
  cut into thin sections...), itself re-transformable (1 to 3 levels typical, up
  to ~10). Part of the original is always preserved.

## Personas

- **Reader** (unauthenticated): browses, filters, and searches published samples.
- **Authenticated user**: declares samples, with a per-sample role:
  - _Contributor_: enters sample info during declaration; invites others.
  - _Editor_: validates declarations and edits info after validation.
- **Admin**: moderates users and declared information.

Primary persona is the researcher: tool-fatigued and change-averse, so the
product must be easy to adopt.

## Packages

- `domain`: shared business logic and contracts (domain models, IGSN validation,
  service/repository interfaces). No I/O; consumed by all other packages.
- `design-system`: shared UI (shadcn/ui components, styles, shadcn config).
  shadcn components MUST be added here, never in an app. Consumed by `frontend`
  and `admin`.
- `frontend`: public app for unauthenticated readers (browse/search).
- `admin`: app for authenticated users (Contributor/Editor) and admins.
- `api`: backend API holding all business domain logic; `frontend` and `admin`
  use it for CRUD.

## Practices

Use the `ponytail` skill: prefer the laziest solution that works (YAGNI, stdlib
and native features before dependencies, shortest correct diff, keep code minimal).

Use Context7 to read a package's docs before using or configuring it, rather
than relying on memory.

## Commands

pnpm monorepo (packages in `packages/`). Prefer `pnpm <script>` so you can append
files or args (`pnpm test path/to/file`, `pnpm lint:check --quiet`). The
`makefile` wraps common ones (`make install`, `make dev`, `make lint`, `make test`).

- `pnpm test`: run tests headless (`pnpm test:browser` interactive, `pnpm test:watch` watch)
- `pnpm lint:apply` / `pnpm lint:check`: lint with/without writing fixes
- `pnpm fmt:apply` / `pnpm fmt:check`: format with/without writing fixes
- `make dev`: run the stack via `docker-compose.dev.yml` (watch + build)

## Services (dev)

- `admin`: http://localhost:3001
- `api`: http://localhost:3002
- `frontend`: http://localhost:3000
