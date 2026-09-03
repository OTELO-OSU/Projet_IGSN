---
type: domain-model
title: Institutional groups (organisme / OSU / labo)
description: >-
  A static generated catalog forming a graph, not a chain; membership is three
  codes recorded on a user and snapshotted on a sample.
resource: packages/domain/src/institutional-group
tags:
  - domain
  - groups
  - institutions
relations:
  - type: depends_on
    target: sync-institutions-import
status: stable
---

One of the two group mechanisms, the other being [[manual-groups]]. Institutional groups are static catalogs in `domain` with derived membership, never curated rows.

- **It is a graph, not a chain**: many labos per organisme, a labo shared by several organismes (co-tutelle), an OSU in one or more organismes derived from its labos, a labo in zero or one OSU.
- `domain/institutional-group/filter-laboratories-by-org-and-osu.ts` is the single source of truth for a group's labos: the form offers that list and `institutional-groups-validator.ts` checks against it.
- The OSU only narrows, so no OSU means any labo of the organisme, OSU-bound included. A submitted OSU MUST belong to the submitted organisme, so a co-tutelle user picking the other organisme records no OSU.
- `institution-laboratory-codes.ts` resolves one `institution` filter param (`organization:<ror>` / `osu:<ror>/<code>` / `laboratory:<code>`) through that source, shared by the admin moderation institution filter and the `/institutional-groups/laboratories` list, both driven by the same `InstitutionTreeFilter`. Because an OSU spans several organismes, that param names the organisme too and resolves to that organisme's labos alone.
- `user/managed-laboratory-codes.ts` is deliberately NOT that path: its organisme to OSU widening reaches other organismes' laboratories, right for a manager's own reach ([[space-manager-scope]]) and wrong for the moderation filter.
- **Membership is three codes recorded on the `user` row**; a sample snapshots the same three at creation and never after, and they stay out of `createSampleSchema`. Moderation reach reads the sample's own codes and groups, but the user row for a user.
- The admin group lists filter the static catalogs client-side, but their members come from `GET /admin/users`, filtered in SQL by `institutionalOrganization` / `institutionalOsu` / `institutionalLaboratory`. The admin users list offers the same `InstitutionTreeFilter` but keeps `institution` alone in the URL, mapping it onto those three params in `admin/src/users/institution-user-params.ts`, a user row recording its own codes and needing no labo resolution. `GET /admin/users/institutional-counts` counts those recorded codes in one grouped query, so an OSU shared across organismes reports one total.
- `osu.ts` and `laboratory.ts` are generated from the `sync-data/` CSV export by `domain/scripts/sync-institutions.ts`, shaped like `organization.ts`; see [[sync-institutions-import]].
- `api/src/institutional-group/` is that entity's first repository (managers, active-manager counts), and `api/src/user/orphaned-groups-of-user.ts` plus the two repositories' `listWithoutActiveManager` methods are the single "who still manages this group" queries.
