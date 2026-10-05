# Architecture

## Package layering

- `domain`: shared business logic and contracts (IGSN validation, domain models, service/repository interfaces), with no I/O, no DB, no HTTP.
- `api`: implements the services/repositories declared in `domain`, holding the trust boundary and the wiring, not the contracts.
- `admin` / `frontend`: consume `domain` types and schemas and call `api` for CRUD.
- Logic shared by `frontend`/`admin` and/or `api` MUST live in `domain`.
- `domain/auth/` holds the oidc helpers shared by `admin` and `frontend` (`sign-in.ts`, `safe-return-path.ts`); add a shared auth helper there, not a per-app copy.
- A service or repository signature MUST live in `domain`; only its implementation lives in `api`.
- `domain/sample/core/` is the single place mapping `Sample` to and from IGSN Core, and `core-path.ts` translates every internal path the `/service` errors emit; see ADR 0040.

## Institutional groups

- This is one of two group mechanisms: manual groups are super-admin-curated rows with explicit membership, unrelated to any catalog here; see ADR 0025.
- Organisme / OSU / Labo is a graph, not a chain: many labos per organisme, a labo shared by several organismes (co-tutelle), an OSU in one or more organismes, derived from its labos, a labo in zero or one OSU.
- `domain/institutional-group/filter-laboratories-by-org-and-osu.ts` is the single source of truth for a group's labos: the form offers that list, `institutional-groups-validator.ts` checks a user's trio against it and `createRepositorySchema` a sample's archive OSU and laboratory.
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
- `domain/service-account/` and `api/src/service-account/` are the service account: a super-admin-declared non-human account with a name, a required owner, an institutional trio and managed groups, its own table never a user row, never a manager on a group page or in a count; its future sample reach is `managerScope` + `moderatedSampleWhere`; see ADR 0035.
- An accepted user requests one from the Services section of admin Settings, where the owner alone rotates its API key (SHA-256 hash at rest, shown once), and `/service` is the resulting machine mount, `GET /service/samples` reading publicly (redacted, every published sample, `?editable=true` ignored) or with a valid key (unredacted, narrowed to the account's own `managerScope` on `?editable=true`), `POST /service/samples` creating and publishing one owned by the account's owner and snapshotting the account's own trio, `POST /service/samples/batch` doing the same for 1 to 500 keyed `items` in one transaction (202 with the batch read's body, queued `publishing`, an optional `webhook: { url, secret }` stored once in `sample_batch_webhook` and called once per sample each time its publication succeeds or fails by `api/src/sample-batch/webhook-worker.ts`, https to public hosts only, but for the hosts in `WEBHOOK_DEV_HOSTS`) and `GET /service/batches/{id}` polling it (`{ partnerId, id, status, igsn, publishingError }` per item), 403 for writing with a missing or unknown key, or reading with an unknown one; see ADR 0036.
- `POST /admin/samples/export` (`api/src/sample/bulk-edit/`) answers the published, non-synthetic, non-mineral samples of a list, its current `filters` or checked `ids`, as an editable xlsx, reusing the import template's builder (`import-template/workbook.ts`), capped at `MAX_IMPORT_ROWS` (422 above).
- The export's reach follows the calling list: `assignedTo` for `moderated: false`, the caller's moderation scope (403 without one) for `moderated: true`, never a union.
- `POST /admin/samples/bulk-edit` (`api/src/sample/bulk-edit/`) re-imports that xlsx once edited, matching each row to a sample by `Sample #` (internal number), all-or-nothing (422 with issues), 403 without `canPublishSamples`, 503 when DataCite is down, 200 `{ count }`; only template columns change, never owner, collaborators, manual groups, parents, attachments, status or dates, and a frozen cell that differs from the stored value refuses the row, no super admin bypass.
- The export carries the "Process steps" sheet only when an exported sample has a parent, and a re-imported file with that sheet replaces a published sub-sample's steps while one without it keeps them.
- `internal_number` is drawn from one global sequence, `sample_internal_number_seq`, by every publish path.
- `POST /admin/samples/import-template/reservation` locks `sample` and advances that sequence by `count`, pre-filling the template's `Sample #` with those `sample-N`, so every later publish skips the range.
- A reserved ID never expires and anyone may use it.
- `POST /admin/samples/import` queues a row whose `Sample #` holds an available `sample-N` under that internal number, `publishSample` keeping it.
- `POST /admin/samples/import/duplicates` (own 5/min per-user rate limit) checks every row of the workbook against published samples with the form's name, material and collector rule, in one batched query (`findDuplicateSamplesOfEach`, shared by the form's `findDuplicateSamples`), answering `{ data: { row, duplicates }[] }`.
- The admin calls it before any document upload and opens the form's duplicate dialog with "Continue anyway"; the import route does not enforce it, a client-side warning like the form's.

## Server-side sorting and filtering

- Lists are paginated server-side, so sorting and filtering MUST happen in the Postgres query (Kysely `orderBy`/`where`), never in the client or on a fetched page.
- Declare the sort/filter params in the list query schema in `domain`, pass them through the repository, and keep them in the URL app-side.
- Public sample-list filters are driven by the `SAMPLE_FACETS` registry (`domain/sample/search/facets.ts`) as single source of truth; to add or extend one, see the `add-search-facet` skill.
- The free-text global search box is a separate mechanism (`domain/sample/search/search-tokens.ts`), not a facet, and it runs in the ParadeDB index `sample_search_idx` for every `searchFilters` caller; see ADR 0018.
- The admin sample lists accept `ownerId` / `institution` / `manualGroup` / `status` / `collectorName` / `existenceStatus` / `availabilityStatus` on `listSamplesQuerySchema`, ANDed inside the caller's moderation scope; the three `institutional*` facet params stay dropped there, one param one meaning.
- `existenceStatus` and `availabilityStatus` are top-level params, not `SAMPLE_FACETS` entries: the registry is the public facet contract, and these two stay admin-only, off the sidebar and the Core `/service` contract.
- The status filter, the `sort: "status"` order (`array_position` over `sampleStatusSchema.options`, so the enum order is the sort order) and the admin badge all read the `status` column.
- `searchable` (`domain/sample/path/tree-node.ts`) is the public search-facet policy alone; the admin collection-method filter (`admin/src/samples/collection-method-tree-nodes.ts`) offers every hierarchy level regardless of that flag.
- The public `GET /samples/map` (`api/src/sample/service/map-sample.ts`) shares the same filters as the public list, via `sampleFilters`/`publishedScope` in `list-sample.ts`, and clusters server-side with Postgis `ST_SnapToGrid`, a cell floored so a whole-world viewport never exceeds ~64x64 clusters.
- `GET /samples/facets` (`api/src/sample/service/count-facets.ts`) answers each `enum`/`hierarchy`/`linked` facet's disjunctive counts (own filter ignored, a hierarchy node counting its descendants) with one ParadeDB `pdb.agg` terms aggregation per facet over `sample_search_idx`, in one single-table scan of the published, non-sub-sample scope, reusing `sampleFilters`/`publishedScope` from the list query.
- Every transaction that scans ParadeDB (the facet count always; list, map and parent picker when a search is present) runs `set local plan_cache_mode = force_custom_plan`, since ParadeDB ignores parameters or hangs under generic plans.
- That scan joins nothing, so `sample` carries trigger-maintained copies of what the counts and shared filters would join: `location_geom`, `is_sub_sample`, `manual_group_ids`, `contributor_ids`, `mineral_classification_paths`, plus the generated `*_paths` ancestor arrays.

## Publish constraints

A sample's `status` (`draft | publishing | publish_failed | published | withdrawn | tombstone`) drives three separate predicates: `status in PERMANENT_IGSN_STATUSES` (`published | withdrawn | tombstone`; `hasPermanentIgsn` in `domain/sample/publication/has-permanent-igsn.ts`, the constant inline in SQL) gates IGSN permanence (frozen fields, contributor edit rights, manual-group deletion/detach), `status = 'published'` gates public visibility (search, contributor facet, manual-group facet), `status in ('published', 'withdrawn')` gates public resolution at `GET /samples/:igsn` (also the contact form, the attachments and the lineage graph's root); see ADR 0032 and ADR 0033.

`publishing` and `publish_failed` are the publication queue (ADR 0052): the import, `POST /admin/samples/bulk-edit` and `POST /service/samples/batch` all commit rows as `publishing`, the permanent worker in `api/src/sample/service/publishing-worker.ts` (started once in `main.ts`, the only consumer) publishes each in its own transaction, retrying then failing fast into `publish_failed` with the error in `sample.publishing_error`. A `publishing` sample is read-only and undeletable; a `publish_failed` one is undeletable too (`canDeleteSample` allows only `draft`) but otherwise behaves like a draft, and any later successful publish clears its error (`publishSample` writes `publishing_error: null`) and keeps an existing IGSN (`coalesce`). Bulk edit reuses the queue for an already-published sample (`published -> publishing -> published`), keeping its IGSN, `published_at` and DataCite event; `sample_status_requires_igsn` already allows an IGSN on both statuses.

`domain/sample/publication/withdrawn-sample.ts` (`toWithdrawnSample`) is the only place that redacts a withdrawn sample, a field-by-field whitelist so a new `Sample` field stays private by default, and `public-sample.ts` (`toPublicSample`) picks it by status for the public `GET /samples/:igsn`; see ADR 0032.

A published sample is public whole but for the fields `domain/sample/publication/redact-private-contacts.ts` drops: the current archive contact and every person's `*UserId` account link, called by `toPublicSample`, by the public list route and by `/service` reads with no api key; a key-authenticated `/service` read alone keeps the archive contact. A person's resolved name and ORCID stay public; the account link they came from does not.

`GET /samples/:igsn/lineage` walks both directions under one rule: a relative appears if it has a permanent IGSN (`hasPermanentIgsn`, the constant inline in SQL), carrying ADR 0033's parent exception onto the whole graph, a relative without one being absent and stopping traversal past it. The root resolves for `published` and `withdrawn` alike, the pair `GET /samples/:igsn` answers, and a tombstoned root 404s; a tombstoned node carries a `tombstone` flag so the graph names it without linking to its 404; see ADR 0043.

A sample carries 0, 1 or 2 parents, capped in `createSampleSchema` and `coreSampleSchema`, set at creation and never edited; two parents force a synthetic material (frozen and location-less), see ADR 0039.

- The location publish requirement applies to parentless samples only, a sub-sample never setting its own location.
- Creation gives a one-parent sub-sample its parent's `location_id` (`api/src/sample/service/inherit-parent-location.ts`, shared by the admin form, `/service` and the import), already the nearest located ancestor's since every sub-sample inherits at creation; see ADR 0053.

- `api/src/datacite/sync-doi.ts` (`syncDoi`) is the single DataCite write and the single status-to-event map, called by `publishSample` (with `firstRegistration`) and by the `synced` wrapper in `api/src/sample/repository.ts` that every other persisted-sample write goes through, pointing a tombstone at the shared `/tombstone` page; see ADR 0046.

Why a sample cannot be published lives in ONE place, `domain/sample/publication/sample-publish-blockers.ts` (`samplePublishBlockers`), itself derived from `samplePublishRequirements` (every applicable requirement with its `isMet` state; `samplePublishBlockers` keeps its exact signature and just filters the unmet ones plus the non-field blockers).

- The api publish guard, the admin publish tooltip and the admin sample form's live per-tab `(filled/total)` counter (`sample-form-tabs.ts`'s `tabCompleteness`) all derive from `samplePublishRequirements`, the counter and every "\*" through `sampleRequiredFields` (`admin/src/samples/sample-required-fields.ts`).
- Add a constraint by adding a code to `publishBlockerSchema` and pushing a requirement in `samplePublishRequirements` under the field's applicability condition.
- The function has no I/O, so a caller resolves the parent and passes it in `parents`, a `null` entry firing `parent_not_found`; `publish-blocker-path.ts` is the single blocker-to-path map, read by `publishedSampleSchema` and the `/service` 422 body.
- Two admin `Record<PublishBlocker, ...>`s stay exhaustive so a new code fails the build until translated: the admin label map (`publish-blocker-label.ts`, the full sentence) and `publish-blocker-field-label.ts` (the short field label in the "Tab > Field" tooltip line).
- A blocker's form field derives from `publish-blocker-path.ts` through `publishBlockerField` (`sample-draft-field-errors.ts`), and its tab from that field through `sampleFieldTab`.

What a published sample may still change lives in ONE place too, the lock maps at the top of `published-field-lock.ts`.

- Each entry is one frozen field: the key is what `mergePublishedEdit` takes from storage, the value the form field names that edit it.
- A field with an entry is frozen and one without is editable, so freezing a new field is one entry.
- Only a leaf whose lock depends on a frozen sibling is hand-written in the merge helpers.
- Add no parallel classification record and no second list of field names; see ADR 0021.
- A super admin bypasses every lock: `domain/user/can-edit-frozen-sample-fields.ts` (`canEditFrozenSampleFields`) is read both by the api's `mergePublishedEdit` call and by the admin form's `publishedSampleFrozenField` resolver, so a super admin edits everything on a published sample except the IGSN, which stays out of `createSampleSchema`.
- A `tombstone` sample is visible only to a super admin or an in-reach space manager (`api/src/sample/require-sample-access.ts`), `canUpdateSample` refuses it, and who may move a sample between its permanent statuses (`published | withdrawn <-> tombstone`, never `draft`) is `domain/user-sample/can-set-sample-status.ts`, read by the api status route and the admin status menu; see ADR 0033.

`material` is the one field with no entry, because which of its levels lock depends on the stored path.

- That lock lives on the tree node (`TreeNode.frozenWhenPublished`; absent means frozen, a level opens only with an explicit `false`).
- Niveau 1 is that frontier on every branch, its 14 nodes carrying `frozenWhenPublished: false` alongside `optional: true`; see ADR 0037.
- The material tree has one root, `rock_and_sediment`; its children are the former roots (`rock`, `sediment`, `mineral`, `synthetic_rock_mineral`, `extraterrestrial_rock`), and a new top-level kind (liquid, gas) joins as its sibling; see ADR 0038.
- `TreeNode.optional` inherits like `frozenWhenPublished`, so one frontier sets both the publish depth and the unlock depth.
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

`frontend` keeps entity code under `src/domain/<entity>/` and `admin` under `src/<entity>/`, one concern per file, with routes in `src/routes/` wiring data to components and holding no business logic:

- `frontend` splits each operation in two: `client/` holds the fetch call and the response Zod parse, `hook/` the react-query file with that operation's `queryOptions` factory and its hook.
- The split exists so `frontend` route loaders can prefetch, so `admin` does not use it: one `use-<operation>.ts` holds the fetch, the parse and the hook.
- Presentational components stay at the entity root (`sample-list.tsx`, `sample-view.tsx`).

API client naming:

- The fetch function is `getXxxByYyy` / `listXxx`, its react-query hook `useGetXxxByYyy` / `useListXxx`.
- In `frontend` both files share the kebab-case fetch-function name (`client/get-sample-by-id.ts`, `hook/get-sample-by-id.ts`).
- One operation per file, never a combined `sample-query.ts`.
- Keep the `queryOptions` factory (`getXxxByYyyQueryOptions`) in the `frontend` hook file so route loaders can prefetch.

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
