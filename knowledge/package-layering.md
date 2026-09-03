---
type: architecture
title: Package layering
description: >-
  domain owns all business logic with no I/O; api implements it and holds the
  trust boundary; admin and frontend consume domain schemas.
resource: .claude/rules/architecture.md#package-layering
tags:
  - architecture
  - packages
relations:
  - type: depends_on
    target: zod-single-source-of-truth
status: stable
---

pnpm monorepo, packages in `packages/`, wrapped by the `makefile`.

- `domain`: shared business logic and contracts (models, IGSN validation, service/repository interfaces), with no I/O, no DB, no HTTP.
- `api`: implements the services and repositories declared in `domain`, holds the trust boundary and the wiring, never the contracts.
- `admin`: app for Contributors, Editors, space managers and super admins.
- `frontend`: public app for unauthenticated readers.
- `design-system`: shared UI for `frontend` and `admin` (shadcn/ui components, styles). shadcn components are added here, never to an app; it must not import `domain`.
- Logic shared by more than one package MUST live in `domain`. A service or repository signature lives in `domain`, only its implementation in `api`.
- Relative imports inside `domain` carry the explicit `.ts` extension, `api` resolving that source under `nodenext`.
- Consequence: a rule changed in `domain` reaches the form, the api and the public app at once, so none can drift. See [[zod-single-source-of-truth]] and [[file-layout-conventions]].
