# IGSN Project

## Domain

- A registry assigning unique **IGSN** identifiers to **geological samples**, making them discoverable and reusable worldwide.
- **IGSN** (International Generic Sample Number): standardized code uniquely and durably identifying a sample.
- In scope: future physical samples of the solid Earth, extraterrestrial ones included.
- Out of scope: other domains (fauna, flora, archaeology...), past samples.
- **Sub-sample**: part of a sample transformed for analysis (broken, powdered, cut into thin sections...), itself re-transformable (1 to 3 levels typical, up to ~10).
- Part of the original is always preserved.

## Personas

- **Reader** (unauthenticated): browses, filters, and searches published samples.
- **Contributor**: enters sample info during declaration, and invites others.
- **Editor**: validates declarations and edits info after validation.
- Contributor and Editor are per-sample roles of an authenticated user.
- **Admin**: moderates users and declared information.
- Target the researcher: tool-fatigued and change-averse, so adoption must be easy.

## Packages

- `domain`: shared business logic and contracts (models, IGSN validation, service/repository interfaces), with no I/O.
- `design-system`: shared UI for `frontend` and `admin` (shadcn/ui components, styles, shadcn config).
- Add shadcn components to `design-system`, never to an app.
- `frontend`: public app for unauthenticated readers.
- `admin`: app for Contributors, Editors, and admins.
- `api`: backend holding the trust boundary and every implementation, called by `frontend` and `admin` for CRUD.

## Practices

- Use the `ponytail` skill: the laziest solution that works (YAGNI, stdlib and native before dependencies, shortest correct diff).
- Read a package's docs with Context7 before using or configuring it, never from memory.
- Add a sample vocabulary value with the `add-sample-vocabulary` skill.
- Add a sample form field with the `add-domain-entity` then `add-admin-component` skills.

## Commands

- pnpm monorepo, packages in `packages/`, wrapped by the `makefile` (`make install`, `make dev`, `make lint`, `make test`).
- Prefer `pnpm <script>`, so you can append files or args (`pnpm test path/to/file`, `pnpm lint:check --quiet`).
- `pnpm test`: tests headless (`test:browser` interactive, `test:watch` watch).
- `pnpm test --project @projet-igsn/<project>`: one project's tests.
- `pnpm lint:apply` / `lint:check`: lint with/without writing fixes.
- `pnpm fmt:apply` / `fmt:check`: format with/without writing fixes.
- `make dev`: run the stack via `docker-compose.dev.yml` (watch + build).
- `make test-e2e`: throwaway prod stack + Playwright e2e, torn down after.

## Services (dev)

- One origin, http://localhost:3000: `frontend` at `/`, `admin` at `/admin`, `api` at `/api`.
- `keycloak`: http://localhost:8080
- `maildev` (mail sink UI): http://localhost:1080
