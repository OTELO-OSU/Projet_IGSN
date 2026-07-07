# Architecture

## Package layering

- `domain`: shared business logic and the contracts. Anything used by more than
  one package (IGSN validation, domain models, service/repository interfaces)
  MUST live here. No I/O, no DB, no HTTP.
- `api`: implements the services/repositories declared in `domain`, mapping them
  to the database. Holds the trust boundary and the wiring, not the contracts.
- `admin` / `frontend`: consume `domain` types and schemas; call `api` for CRUD.

Two hard rules:

- If logic is shared by `frontend`/`admin` and/or `api`, it MUST live in
  `domain` (e.g. IGSN validation).
- A service or repository signature/interface MUST live in `domain`; only its
  implementation lives in `api`.

## Publish constraints

The reasons a sample cannot be published live in ONE place:
`domain/sample/sample-publish-blockers.ts` (`samplePublishBlockers`).
`isSamplePublishable` and the admin publish tooltip both derive from it. When you
add a publish constraint, add a code to `publishBlockerSchema` and push it in
`samplePublishBlockers`; the admin label map (`publish-blocker-label.ts`) is an
exhaustive `Record<PublishBlocker, () => string>`, so it fails to compile until
the new reason is translated and thus shown in the tooltip.

## File layout

One folder per entity, one concern per file, kebab-case folder. No barrel/index.

`domain` (callers import the subpath, `@projet-igsn/domain/<entity>/model`):

- `<entity>/model.ts`: domain model (Zod schema + inferred type).
- `<entity>/repository.ts`: repository / service interface that `api` implements.
- `<entity>/<model>-validator.ts`: request validators shared by more than one
  package (e.g. `sample-validator.ts` holds `createSampleSchema`). `model.ts`
  owns the persisted entity; input-shape validators live here.
- `<entity>/<function>.ts`: shared logic that is neither a model nor a
  repository, one function per file (e.g. `igsn/generate-igsn-suffix.ts` holds
  `generateIgsnSuffix`).

Relative imports inside `domain` MUST carry the explicit `.ts` extension
(`./model.ts`), since `api` resolves this source under `nodenext` and Node's
ESM runtime requires it.

`api` mirrors the same folder-per-entity shape:

- `<entity>/repository.ts`: implements the domain interface, persistence only.
- `<entity>/routes.ts`: Hono sub-app mounted in `app.ts`.
- `<entity>/validator.ts`: request validators used only by `api`. Anything a
  second package needs belongs in `domain/<entity>/<model>-validator.ts`.

`frontend` / `admin` keep entity code under `src/domain/<entity>/`, one concern
per file (data fetch, react-query hook, presentational component). Routes stay in
`src/routes/`; they wire data to the entity's components, holding no business
logic themselves.

Under `src/domain/<entity>/`, group by concern in subfolders:

- `client/`: one API fetch helper per operation (the `fetch` call + response
  Zod parse).
- `hook/`: one react-query file per operation, holding that operation's
  `queryOptions` factory and its hook.
- Presentational components stay at the entity root (`sample-list.tsx`,
  `sample-view.tsx`).

API client naming: the fetch function is `getXxxByYyy` / `listXxx`, its
react-query hook is `useGetXxxByYyy` / `useListXxx`, and both files share the
kebab-case fetch-function name (`client/get-sample-by-id.ts`,
`hook/get-sample-by-id.ts`). One operation per hook file, never a combined
`sample-query.ts`. Keep the `queryOptions` factory (`getXxxByYyyQueryOptions`)
in the hook file so route loaders can prefetch; the hook wraps it for components.

## Decision records (ADR)

Every architecture decision MUST be recorded as an ADR. ADRs live in
`docs/adr/`, are markdown, and are named `XXXX-kebab-title.md` where `XXXX` is
a zero-padded incrementing number (`0001-`, `0002-`...). One decision per file.

## Zod naming

Name schemas `xxxSchema` (camelCase + `Schema`). Infer the type under the
PascalCase domain name:

    export const igsnSchema = z.string()/* ... */
    export type Igsn = z.infer<typeof igsnSchema>
