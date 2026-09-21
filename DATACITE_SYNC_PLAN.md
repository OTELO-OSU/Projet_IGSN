# Sync the DataCite DOI on sample update and status change

## Context

`origin/main` (ADR 0044, PR #233) registers a DOI at DataCite inside `publishSample` with `PUT /dois/{prefix}/{igsn}` (`event: publish` for `published`, `register` for `withdrawn`). ADR 0044 lists as an open consequence: "`PUT /admin/samples/:id/status` and later metadata edits are not synced to DataCite". This change closes it:

- an edit of a sample carrying a DOI re-PUTs the full metadata;
- `published` maps to DataCite state findable (`event: publish`);
- `withdrawn` maps to registered (`event: hide`);
- `tombstone` maps to registered (`event: hide`) and points the DOI `url` at a single public tombstone page, `/tombstone`, shared by every tombstoned sample (DataCite has no uniqueness rule on `url`, only `doi` is unique).

DataCite's DOI model runs `aasm whiny_transitions: false`: an impossible transition is a silent no-op. So `publish` works from draft and registered, `hide` is harmless on an already registered DOI, and a stateless status-to-event map is enough. The only exception is the first registration of a `withdrawn` sample, which must stay `register` (`hide` from draft would be a no-op leaving a draft DOI); `publishSample` already does that.

### What DataCite must end up with

| Our status | DataCite state | DataCite `url`                               |
| ---------- | -------------- | -------------------------------------------- |
| published  | findable       | `<FRONTEND_URL>samples/<igsn>`               |
| withdrawn  | registered     | `<FRONTEND_URL>samples/<igsn>`               |
| tombstone  | registered     | `<FRONTEND_URL>tombstone` (one page for all) |

Every scenario below reaches exactly that. None is impossible.

### How DataCite is driven

- The state is read-only in the API: lupo's `ParamsSanitizer#cleanse` drops `state` from the body. A state is reached only through the `event` attribute.
- `event: publish` moves draft or registered to findable.
- `event: register` moves draft to registered. From findable it changes nothing.
- `event: hide` moves findable to registered. From draft it changes nothing.
- A DOI that is already in the state an event leads to is left in that state; the `url` and metadata in the same body are saved anyway (`assign_attributes` then `save`, `after_commit :update_url` pushes the url to the handle). `whiny_transitions: false` in `Doi`.
- Our `draft` means DataCite has no DOI. The first PUT creates it in DataCite draft state and applies the event in the same call.

Every call is the same shape, one `PUT`, full metadata every time:

```
PUT {DATACITE_API_HOST}/dois/{prefix}/{igsn}
Authorization: Bearer {DATACITE_API_KEY}
{ "data": { "type": "dois", "attributes": { ...toDataCiteSample(toCoreSample(sample)), "url": <url>, "event": <event> } } }
```

### The call per transition

| From      | To               | Where it fires                                                                                            | `event`    | `url`     | DataCite state after                 | As requested                 |
| --------- | ---------------- | --------------------------------------------------------------------------------------------------------- | ---------- | --------- | ------------------------------------ | ---------------------------- |
| draft     | published        | `publishSample` (admin publish, `POST /service/samples`)                                                  | `publish`  | landing   | findable                             | Yes (already on main)        |
| withdrawn | published        | `setSampleStatus`                                                                                         | `publish`  | landing   | findable                             | Yes                          |
| tombstone | published        | `setSampleStatus`                                                                                         | `publish`  | landing   | findable                             | Yes                          |
| draft     | withdrawn        | `publishSample` (`?status=withdrawn`)                                                                     | `register` | landing   | registered                           | Yes (already on main)        |
| published | withdrawn        | `setSampleStatus`                                                                                         | `hide`     | landing   | registered                           | Yes                          |
| tombstone | withdrawn        | `setSampleStatus`                                                                                         | `hide`     | landing   | registered (unchanged), url restored | Yes                          |
| draft     | tombstone        | not possible in the app: `publishStatusSchema` excludes `tombstone`, `canSetSampleStatus` refuses a draft |            |           |                                      | Not reachable, nothing to do |
| published | tombstone        | `setSampleStatus`                                                                                         | `hide`     | tombstone | registered                           | Yes                          |
| withdrawn | tombstone        | `setSampleStatus`                                                                                         | `hide`     | tombstone | registered (unchanged), url moved    | Yes                          |
| published | published (edit) | `updateSample` (admin PUT, `PUT /service/samples/:igsn`)                                                  | `publish`  | landing   | findable, metadata refreshed         | Yes                          |
| withdrawn | withdrawn (edit) | `updateSample`                                                                                            | `hide`     | landing   | registered, metadata refreshed       | Yes                          |
| tombstone | tombstone (edit) | `updateSample` (super admin or manager only)                                                              | `hide`     | tombstone | registered, metadata refreshed       | Yes                          |

### The exact DataCite request per scenario

Example values: `DATACITE_API_HOST=https://api.test.datacite.org`, `DATACITE_DOI_PREFIX=10.70113`, `FRONTEND_URL=https://igsn.example.org/`, igsn `ABCDEFGHJKMNPQRSTVWXYZ0123`. Every request carries the same headers and the full metadata (`...metadata` below stands for every attribute `toDataCiteSample` produces: `doi`, `titles`, `creators`, `publisher`, `publicationYear`, `types`, `dates`, `geoLocations`, ...). Only `url` and `event` differ.

```
PUT https://api.test.datacite.org/dois/10.70113/ABCDEFGHJKMNPQRSTVWXYZ0123
Authorization: Bearer <DATACITE_API_KEY>
Content-Type: application/json
```

1. draft to published (first publication)

```json
{ "data": { "type": "dois", "attributes": { ...metadata,
  "url": "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
  "event": "publish" } } }
```

DataCite creates the DOI and sets it findable.

2. withdrawn to published

```json
{ "data": { "type": "dois", "attributes": { ...metadata,
  "url": "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
  "event": "publish" } } }
```

registered to findable.

3. tombstone to published

```json
{ "data": { "type": "dois", "attributes": { ...metadata,
  "url": "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
  "event": "publish" } } }
```

registered to findable, url back to the landing page.

4. draft to withdrawn (first publication as withdrawn)

```json
{ "data": { "type": "dois", "attributes": { ...metadata,
  "url": "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
  "event": "register" } } }
```

DataCite creates the DOI and sets it registered.

5. published to withdrawn

```json
{ "data": { "type": "dois", "attributes": { ...metadata,
  "url": "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
  "event": "hide" } } }
```

findable to registered.

6. tombstone to withdrawn

```json
{ "data": { "type": "dois", "attributes": { ...metadata,
  "url": "https://igsn.example.org/samples/ABCDEFGHJKMNPQRSTVWXYZ0123",
  "event": "hide" } } }
```

stays registered, url back to the landing page.

7. draft to tombstone: no request, the app cannot do this transition.

8. published to tombstone

```json
{ "data": { "type": "dois", "attributes": { ...metadata,
  "url": "https://igsn.example.org/tombstone",
  "event": "hide" } } }
```

findable to registered, url to the shared tombstone page.

9. withdrawn to tombstone

```json
{ "data": { "type": "dois", "attributes": { ...metadata,
  "url": "https://igsn.example.org/tombstone",
  "event": "hide" } } }
```

stays registered, url to the shared tombstone page.

10. metadata edit, status unchanged: the same request as the row above for the current status (request 2 for published, request 5 for withdrawn, request 8 for tombstone), with the new metadata. State unchanged, metadata refreshed.

Four distinct bodies in total: landing url + `publish`, landing url + `register` (first publication as withdrawn only), landing url + `hide`, tombstone url + `hide`.

"Already on main" means merged PR #233 (commit b02fd0e2, ADR 0044), which this branch does not contain yet. On `origin/main`, `packages/api/src/sample/service/publish-sample.ts` lines 35 to 40 already read:

```ts
if (config)
  await registerDoi(
    config,
    sample,
    status === "published" ? "publish" : "register",
  );
```

and `publish-sample.spec.ts` asserts both events (`published` sends `publish`, `withdrawn` sends `register`). Step 0 merges it in; this plan changes none of it.

Rule that produces the table: `publishSample` keeps sending `publish` for `published` and `register` for `withdrawn` (the DOI is new, so `register` is the event that works from draft). Every other write sends `publish` when our status is `published` and `hide` otherwise, with `url` = `<FRONTEND_URL>tombstone` when our status is `tombstone`, landing page otherwise.

Two caveats, both pre-existing (ADR 0044): a sample published before DataCite was configured has no `doiPrefix` and is never synced, and a withdrawn or tombstoned sample sends its full record to DataCite while the public site redacts it (a registered DOI is not indexed by DataCite search, but its metadata is retrievable by anyone knowing the DOI).

Decisions confirmed by the user: the tombstone page is one static generic frontend route, `/tombstone`, shared by every tombstoned DOI, calling no API and naming no sample (the API keeps 404ing tombstones, ADR 0033 stays intact on the API side); a DataCite failure on update or status change fails the save with a 502 and rollback, exactly like publish.

`feat/datacite-update` is at the old `main` (4cbe161e) and lacks the whole registration feature. Step 0 brings it in.

## Step 0: bring in origin/main

`git merge origin/main` on the current branch `feat/datacite-update` (no new branch). Clean tree, fast-forward expected. Then `pnpm install` (lockfile may have moved) and confirm `packages/api/src/datacite/register-doi.ts` exists.

## API (packages/api)

### 1. Generalize `register-doi.ts` into `sync-doi.ts`

Rename `packages/api/src/datacite/register-doi.ts` to `sync-doi.ts` and `registerDoi` to `syncDoi` (logic changes, so the name changes in the same commit). Same for the spec and the log message ("DOI sync failed"); keep the 502 message text or rename to "DOI sync failed" consistently in `admin-routes.spec.ts`.

```ts
export type DoiEvent = "publish" | "register" | "hide";

// hide moves findable to registered and is a no-op on a registered DOI; register is only for a DOI DataCite has never seen (publishSample).
const doiEvent = (status: Sample["status"]): DoiEvent =>
  status === "published" ? "publish" : "hide";

export async function syncDoi(
  config: DataCiteConfig | null,
  sample: Sample,
  event: DoiEvent = doiEvent(sample.status),
): Promise<void> {
  if (!config || !sample.doiPrefix) return;
  const frontendUrl = appUrl("FRONTEND_URL");
  const record = toDataCiteSample(toCoreSample(sample, frontendUrl));
  // One shared page for every tombstoned DOI; must match packages/frontend/src/routes/tombstone.tsx
  const url = sample.status === "tombstone" ? `${frontendUrl}tombstone` : record.url;
  ... existing PUT with attributes { ...record, url, event }, same timeout, same 502 ...
}
```

The `!config || !sample.doiPrefix` guard is the single gate: drafts and rows published before DataCite was configured have no prefix and get no call. `publishSample` always has a prefix after its `coalesce`, so it is unaffected.

Spec (`sync-doi.spec.ts`, from the existing one): keep the two existing tests; add

- skips fetch when `config` is null or `sample.doiPrefix` is null;
- defaults the event from status (`withdrawn` sends `hide`, `published` sends `publish`);
- a `tombstone` sample sends `event: hide` and `url: <FRONTEND_URL>tombstone`; a `withdrawn` one keeps the landing page url.

### 2. Call it from the three mutation services

- `sample/service/publish-sample.ts`: replace `registerDoi(config, sample, status === "published" ? "publish" : "register")` with `syncDoi(...)`, same arguments. No behavior change.
- `sample/service/update-sample.ts`: add a trailing `config: DataCiteConfig | null = null` param; after `getSampleById`, `await syncDoi(config, sample)` and return the sample. Covers both `PUT /admin/samples/:id` and `PUT /service/samples/:igsn`, since both go through `repository.update`.
- `sample/service/set-sample-status.ts`: same trailing param and the same call after `getSampleById`.
- `sample/repository.ts`: wrap `update` and `setStatus` like `publish` already is: `withTransaction(db, (trx) => updateSample(trx, id, input, dataCite))`, so the row lock and rollback cover the round trip. Add a `ponytail:` comment only if it is not already on `publishSample` (it is; reference it rather than repeat).

Tests, all with `stubDataCite` from `packages/api/src/tests/stub-datacite.ts` and `pgTest`:

- `update-sample.spec.ts`: a sample published with `STUB_DATACITE_CONFIG` then updated sends one PUT whose body has `event: "publish"` and the new `titles[0].title`; a draft updated sends no fetch.
- `set-sample-status.spec.ts`: `withdrawn` sends `hide`; `tombstone` sends `hide` with the tombstone url; back to `published` sends `publish` with the landing url; a sample published without config (no prefix) sends nothing.
- `admin-routes.spec.ts`: one test "should answer 502 and keep the status when DataCite refuses the status change" (mirror the existing publish 502 test at the same file, and assert the row status is unchanged after rollback). One equivalent test on `PUT /admin/samples/:id` is optional; skip if the service test already proves the wiring.

No new env var, so no compose change (infra parity rule satisfied). The dev/e2e Caddy mock already answers 201 to any `PUT /dois/*`.

## Frontend (packages/frontend)

### 3. Public tombstone page

- New route file `packages/frontend/src/routes/tombstone.tsx`, path `/tombstone`, a sibling of `search.tsx`. Run `make generate` to regenerate `routeTree.gen.ts` (never `pnpm build`, it dirties the file).
- No params, no loader, no API call. Renders a new presentational `packages/frontend/src/domain/samples/tombstone-notice.tsx`: a heading and a sentence saying the sample this identifier pointed to was permanently removed from the registry. It names no sample, since one page serves every tombstoned DOI. Add `robots: noindex` in `head` like the withdrawn branch of `samples/$igsn.tsx`, and a title.
- Messages: add `sample_tombstone_title` and `sample_tombstone_notice` to `packages/frontend/messages/en.json` and the French catalog next to it (check `ls packages/frontend/messages`), following `sample_withdrawn_notice`.
- Spec `tombstone-notice.spec.tsx` (Vitest browser mode, role queries): renders the heading and the notice.
- e2e: in `e2e/frontend/sample-tombstone.spec.ts` add one test "redirects its DOI to the shared tombstone page" that opens `/tombstone` and asserts the heading. Keep "has no public page" as is: `/samples/:igsn` still 404s.

## Docs

- New `docs/adr/0045-doi-lifecycle-sync.md`: decision (every `Sample` mutation of a DOI-bearing row re-PUTs the record; status-to-state map; tombstone url; same-transaction 502 semantics; `syncDoi` as the one place), rejected (async sync; a per-sample `/samples/:igsn/tombstone` page, which would name a sample the API refuses to serve; a redacted tombstone payload from the API), consequences (every tombstoned DOI resolves to the same page, so a visitor cannot tell which sample it was; a DataCite outage blocks edits of published samples). Link ADR 0033 and 0044.
- ADR 0044: replace the "not synced (out of scope, follow-up)" consequence with a link to 0045.
- ADR 0033: annotate the rejected "public tombstone page" bullet: superseded by 0045 with one generic page as the DataCite landing url only; `GET /samples/:igsn` still 404s.
- `docs/datacite-mapping.md` Registration section: rename to "Registration and sync", name `sync-doi.ts`, list the three callers and the state map.
- `.claude/rules/architecture.md`, Publish constraints: one bullet naming `api/src/datacite/sync-doi.ts` as the single DataCite write, called from `publishSample`, `updateSample` and `setSampleStatus`.

## Verification

1. `pnpm lint:check` (type gate).
2. `pnpm test --project @projet-igsn/api`, then `--project @projet-igsn/frontend`, then `@projet-igsn/domain` (rerun per project if the combined run flakes).
3. `make test-e2e` once at the end; read the passed count against the suite total, not the exit code.
4. Manual against the real state machine: the dev Caddy mock holds no state, so run `make dev` with `DATACITE_API_HOST=https://api.test.datacite.org` and the test key from `infra/preprod/docker-compose.env`, publish a sample, then walk published, withdrawn, tombstone, withdrawn, published. After each step `GET https://api.test.datacite.org/dois/10.70113/<igsn>` and check `attributes.state` (findable, registered, registered, registered, findable) and `attributes.url` (landing, landing, tombstone, landing, landing). Open `http://localhost:3000/tombstone`.

Commit with `git add` for the new files first, then `git commit -- <pathspec>`, docs in the same commit as the code.
