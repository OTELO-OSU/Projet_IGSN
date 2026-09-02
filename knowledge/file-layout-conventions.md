---
type: architecture
title: File layout conventions
description: >-
  One folder per entity, one concern per file, kebab-case, no barrel files; api
  client and hook naming.
resource: .claude/rules/architecture.md#file-layout
tags:
  - architecture
  - conventions
relations:
  - type: depends_on
    target: package-layering
status: stable
---

One folder per entity, one concern per file, kebab-case folders, no barrel or index file.

`domain` (callers import the subpath, `@projet-igsn/domain/<entity>/model`):

- `<entity>/model.ts`: Zod schema plus inferred type.
- `<entity>/repository.ts`: the interface `api` implements.
- `<entity>/<model>-validator.ts`: validators shared by more than one package.
- `<entity>/<function>.ts`: one shared function per file.

`api` mirrors it: `<entity>/repository.ts` (persistence only), `<entity>/routes.ts` (Hono sub-app mounted in `app.ts`), `<entity>/validator.ts` (api-only validators).

`admin` / `frontend`: entity code under `src/domain/<entity>/`, routes in `src/routes/` wiring data to components with no business logic.

- `client/`: one fetch helper per operation (fetch plus response Zod parse).
- `hook/`: one react-query file per operation, holding its `queryOptions` factory so route loaders can prefetch.
- Presentational components at the entity root (`sample-list.tsx`).
- Naming: `getXxxByYyy` / `listXxx`, hook `useGetXxxByYyy` / `useListXxx`, both files sharing the kebab-case fetch-function name. One operation per hook file.

Zod naming: schemas are `xxxSchema`, the inferred type takes the PascalCase domain name.
