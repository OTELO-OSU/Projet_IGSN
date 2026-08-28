# Architecture

## Package layering

- `domain`: shared business logic and contracts (IGSN validation, domain models, service/repository interfaces), with no I/O, no DB, no HTTP.
- `api`: implements the services/repositories declared in `domain`, holding the trust boundary and the wiring, not the contracts.
- `admin` / `frontend`: consume `domain` types and schemas and call `api` for CRUD.
- Logic shared by `frontend`/`admin` and/or `api` MUST live in `domain`.
- A service or repository signature MUST live in `domain`; only its implementation lives in `api`.

## Institutional groups

- This is one of two group mechanisms: manual groups are super-admin-curated rows with explicit membership, unrelated to any catalog here; see ADR 0025.
- Organisme / OSU / Labo is a graph, not a chain: many labos per organisme, a labo shared by several organismes (co-tutelle), an OSU in one or more organismes, derived from its labos, a labo in zero or one OSU.
- `domain/institutional-group/filter-laboratories-by-org-and-osu.ts` is the single source of truth for a group's labos: the form offers that list and `institutional-groups-validator.ts` checks against it.
- `institution-laboratory-codes.ts` resolves one `institution` filter param (`organization:<ror>` / `osu:<ror>/<code>` / `laboratory:<code>`) through that source, shared by the admin moderation institution filter and the admin `/institutional-groups/laboratories` list, both driven by the same `InstitutionTreeFilter`.
- `user/managed-laboratory-codes.ts` is deliberately not that path: its organisme -> OSU widening reaches other organismes' laboratories, which is right for a manager's own reach but wrong for the moderation institution filter.
- An OSU spans several organismes, so the moderation institution filter names the organisme too (`osu:<ror>/<code>`) and resolves to that organisme's labos alone.
- The admin group lists filter the static `domain` catalogs client-side, but their members come from `GET /admin/users`, filtered in SQL by `institutionalOrganization` / `institutionalOsu` / `institutionalLaboratory`; that same response also carries each user's manual groups (`AdminUser.manualGroups`), unrelated to this catalog.
- The admin users list offers the same `InstitutionTreeFilter` but keeps `institution` in the URL alone, mapping it onto those three params in `admin/src/users/institution-user-params.ts`, since a user row records its own codes and needs no labo resolution.
- `GET /admin/users/institutional-counts` counts those same recorded codes in one grouped query, so an OSU shared across organismes reports one total.
- The OSU only narrows, so no OSU means any labo of the organisme, OSU-bound included.
- A submitted OSU MUST belong to the submitted organisme, so a co-tutelle user picking the other organisme records no OSU.
- `osu.ts` and `laboratory.ts` are generated from the `sync-data/` CSV export by `domain/scripts/sync-institutions.ts`, shaped like `institutional-group/organization.ts`.
- A sample snapshots the three codes at creation, never after, and they stay out of `createSampleSchema`.
- A sample also carries manual groups its owner picks and edits, frozen once published; see ADR 0025.
- Moderation reach reads the sample's own codes and groups (`api/src/sample/service/moderated-sample-where.ts`), but the user row for a user (`api/src/user/moderation-scope-where.ts`); see ADR 0030.
- `api/src/institutional-group/` is that entity's first repository (managers, active-manager counts); `api/src/user/orphaned-groups-of-user.ts` and the two repositories' `listWithoutActiveManager` methods are the single "who still manages this group" queries, shared by the orphan-group mail, the pending-users digest recap and the group lists; see ADR 0030.

## Server-side sorting and filtering

- Lists are paginated server-side, so sorting and filtering MUST happen in the Postgres query (Kysely `orderBy`/`where`), never in the client or on a fetched page.
- Declare the sort/filter params in the list query schema in `domain`, pass them through the repository, and keep them in the URL app-side.
- Public sample-list filters are driven by the `SAMPLE_FACETS` registry (`domain/sample/search/facets.ts`) as single source of truth; to add or extend one, see the `add-search-facet` skill.
- The free-text global search box is a separate mechanism (`domain/sample/search/search-tokens.ts`), not a facet; see ADR 0018.
- The admin sample lists accept `ownerId` / `institution` / `manualGroup` / `status` on `listSamplesQuerySchema`, ANDed inside the caller's moderation scope; the three `institutional*` facet params stay dropped there, one param one meaning.
- `status` filters on `igsn`, never the `published` column, so the filter, the `sort: "status"` order and the admin badge all read one field.
- `searchable` (`domain/sample/path/tree-node.ts`) is the public search-facet policy alone; the admin collection-method filter (`admin/src/samples/collection-method-tree-nodes.ts`) offers every hierarchy level regardless of that flag.

## Publish constraints

A sample's `status` (`draft | published | withdrawn`) drives two separate predicates: `status <> 'draft'` (`hasPermanentIgsn` in `domain/sample/publication/has-permanent-igsn.ts`, inline in SQL) gates IGSN permanence (frozen fields, contributor edit rights, manual-group deletion/detach), `status = 'published'` gates public visibility (search, contributor facet, manual-group facet); see ADR 0032.

`domain/sample/publication/withdrawn-sample.ts` (`toWithdrawnSample`) is the only place that redacts a withdrawn sample, a field-by-field whitelist so a new `Sample` field stays private by default, and `public-sample.ts` (`toPublicSample`) picks it by status for the public `GET /samples/:igsn`; see ADR 0032.

Why a sample cannot be published lives in ONE place, `domain/sample/publication/sample-publish-blockers.ts` (`samplePublishBlockers`).

- The api publish guard and the admin publish tooltip both derive from it.
- Add a constraint by adding a code to `publishBlockerSchema` and pushing it in `samplePublishBlockers`.
- The admin label map (`publish-blocker-label.ts`) is an exhaustive `Record<PublishBlocker, () => string>`, so it fails to compile until the new reason is translated.

What a published sample may still change lives in ONE place too, the lock maps at the top of `published-field-lock.ts`.

- Each entry is one frozen field: the key is what `mergePublishedEdit` takes from storage, the value the form field names that edit it.
- A field with an entry is frozen and one without is editable, so freezing a new field is one entry.
- Only a leaf whose lock depends on a frozen sibling is hand-written in the merge helpers.
- Add no parallel classification record and no second list of field names; see ADR 0021.
- A super admin bypasses every lock: `domain/user/can-edit-frozen-sample-fields.ts` (`canEditFrozenSampleFields`) is read both by the api's `mergePublishedEdit` call and by the admin form's `publishedSampleFrozenField` resolver, so a super admin edits everything on a published sample except the IGSN, which stays out of `createSampleSchema`.

`material` is the one field with no entry, because which of its levels lock depends on the stored path.

- That lock lives on the tree node (`TreeNode.frozenWhenPublished`; absent means frozen, a level opens only with an explicit `false`).
- `frozenMaterialPrefix` derives the prefix a published sample must keep, read by both `mergeMaterial` and the admin form; see ADR 0022.

The admin form never restates that rule.

- It consumes the maps' flattened form names (`FROZEN_FORM_FIELDS`, `FROZEN_FORM_FIELDS_BY_PROVENANCE`) through `publishedSampleFrozenField` (`admin/src/samples/published-sample-frozen-field.ts`), which adds only the hierarchy-level suffix stripping and the frozen material depth from `frozenMaterialDepth`.
- `SampleForm` feeds it to the form kit's `FieldDisabledProvider`.
- No control decides for itself that publication freezes it: a kit field control resolves it through `useFieldDisabled`, and a control with no field context (the collection-date mode switch) asks `useIsFieldDisabled()` for the field it follows.
- Freeze a new control by listing its field name in `publishedSampleFrozenField`, never with a published flag of its own.
- In the sample form `disabled` means frozen by publication, or the whole form held read-only because another collaborator holds the edit lock or the api refused the last save as stale (ADR 0024); a field waiting on a sibling is not rendered (see forms.md).

## File layout

One folder per entity, one concern per file, kebab-case folder, no barrel/index.

`domain` (callers import the subpath, `@projet-igsn/domain/<entity>/model`):

- `<entity>/model.ts`: domain model (Zod schema + inferred type).
- `<entity>/repository.ts`: repository / service interface that `api` implements.
- `<entity>/<model>-validator.ts`: request validators shared by more than one package (e.g. `sample-validator.ts` holds `createSampleSchema`).
- `<entity>/<function>.ts`: one shared function per file that is neither a model nor a repository (e.g. `igsn/generate-igsn-suffix.ts`).
- Relative imports inside `domain` MUST carry the explicit `.ts` extension, since `api` resolves this source under `nodenext`.

`api` mirrors the same folder-per-entity shape:

- `<entity>/repository.ts`: implements the domain interface, persistence only.
- `<entity>/routes.ts`: Hono sub-app mounted in `app.ts`.
- `<entity>/validator.ts`: request validators used only by `api`, anything a second package needs going to `domain/<entity>/<model>-validator.ts`.

`frontend` / `admin` keep entity code under `src/domain/<entity>/`, one concern per file, with routes in `src/routes/` wiring data to components and holding no business logic:

- `client/`: one API fetch helper per operation (the `fetch` call + response Zod parse).
- `hook/`: one react-query file per operation, holding that operation's `queryOptions` factory and its hook.
- Presentational components stay at the entity root (`sample-list.tsx`, `sample-view.tsx`).

API client naming:

- The fetch function is `getXxxByYyy` / `listXxx`, its react-query hook `useGetXxxByYyy` / `useListXxx`.
- Both files share the kebab-case fetch-function name (`client/get-sample-by-id.ts`, `hook/get-sample-by-id.ts`).
- One operation per hook file, never a combined `sample-query.ts`.
- Keep the `queryOptions` factory (`getXxxByYyyQueryOptions`) in the hook file so route loaders can prefetch.

## Decision records (ADR)

Record an ADR only for a decision costly to reverse that constrains future work: a new cross-package boundary, a persistence or auth model, a public contract, or a tradeoff where the rejected option was reasonable.

- Skip it for routine choices that follow existing patterns, are local to one file, or are cheap to change later.
- When in doubt, no ADR: a rule or code comment is enough.
- ADRs live in `docs/adr/`, are markdown, and are named `XXXX-kebab-title.md` with a zero-padded incrementing number.
- One decision per file.

## Zod naming

Name schemas `xxxSchema` (camelCase + `Schema`) and infer the type under the PascalCase domain name:

```ts
export const igsnSchema = z.string(); /* ... */
export type Igsn = z.infer<typeof igsnSchema>;
```
