# Architecture

## Package layering

- `domain`: shared business logic and the contracts. Anything used by more than
  one package (IGSN validation, domain models, service/repository interfaces)
  MUST live here. No I/O, no DB, no HTTP.
- `api`: implements the services/repositories declared in `domain`, mapping them
  to the database. Holds the trust boundary and the wiring, not the contracts.
- `admin` / `frontend` _(planned)_: consume `domain` types and schemas; call
  `api` for CRUD.

Two hard rules:

- If logic is shared by `frontend`/`admin` and/or `api`, it MUST live in
  `domain` (e.g. IGSN validation).
- A service or repository signature/interface MUST live in `domain`; only its
  implementation lives in `api`.

## File layout

One folder per entity, one concern per file, kebab-case folder. No barrel/index.

`domain` (callers import the subpath, `@projet-igsn/domain/<entity>/model`):

- `<entity>/model.ts`: domain model (Zod schema + inferred type).
- `<entity>/repository.ts`: repository / service interface that `api` implements.
- `<entity>/<model>-validator.ts`: request validators shared by more than one
  package (e.g. `sample-validator.ts` holds `createSampleSchema`). `model.ts`
  owns the persisted entity; input-shape validators live here.
- `<entity>/helper.ts`: shared logic that is neither a model nor a repository
  (e.g. `igsn/helper.ts` holds `normalizeIgsn`, used by `igsn/model.ts`).

Relative imports inside `domain` MUST carry the explicit `.ts` extension
(`./model.ts`), since `api` resolves this source under `nodenext` and Node's
ESM runtime requires it.

`api` mirrors the same folder-per-entity shape:

- `<entity>/repository.ts`: implements the domain interface, persistence only.
- `<entity>/routes.ts`: Hono sub-app mounted in `app.ts`.
- `<entity>/validator.ts`: request validators used only by `api`. Anything a
  second package needs belongs in `domain/<entity>/<model>-validator.ts`.

## Decision records (ADR)

Every architecture decision MUST be recorded as an ADR. ADRs live in
`docs/adr/`, are markdown, and are named `XXXX-kebab-title.md` where `XXXX` is
a zero-padded incrementing number (`0001-`, `0002-`...). One decision per file.

## Zod naming

Name schemas `xxxSchema` (camelCase + `Schema`). Infer the type under the
PascalCase domain name:

    export const igsnSchema = z.string()/* ... */
    export type Igsn = z.infer<typeof igsnSchema>
