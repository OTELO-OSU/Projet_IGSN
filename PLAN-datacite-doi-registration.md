# Register a DOI at DataCite on publication

## Context

We keep minting the IGSN ourselves: `publishSample` stamps `generateIgsnSuffix(id)` exactly as today, and nothing about IGSN generation changes. What is missing is the registration: the `/service` DataCite projection emits that IGSN in its `doi` field while DataCite knows nothing about the sample.

This adds the registration call on publication, and makes the DataCite `doi` field the real DOI, `<prefix>/<igsn>` (the bare name, as the DataCite API carries it).

Decisions taken with the user:

- The DOI is not stored, its **prefix is**: the sample snapshots `DATACITE_DOI_PREFIX` at publication (it can change over time), and the DOI is computed as `<snapshotted prefix>/<igsn>`.
- A sample with no snapshotted prefix has no DOI: pre-existing rows keep emitting the bare IGSN, so nothing is backfilled and nothing advertises a DOI DataCite never saw.
- Publication is refused when the registration fails, so every prefix we snapshot is a registered DOI.
- The hook sits in `publishSample`, the single function that mints an IGSN: it covers `POST /admin/samples/:id/publish` for both statuses and `POST /service/samples`. `status: "withdrawn"` registers with `event: "register"` (the DOI resolves but is not indexed), `published` with `event: "publish"`.
- `PUT /admin/samples/:id/status` (restore, tombstone) mints no IGSN and is out of scope, as is any later metadata sync.
- Unconfigured (`DATACITE_API_HOST` unset) = skip silently, prefix stays null, so unit tests and any stack without credentials keep publishing. dev and e2e get a mock DataCite service so the path is exercised.

## Storage

- New migration `packages/api/migrations/<utc>-add-sample-doi-prefix.ts`: `alter table sample add column doi_prefix text`, nullable, no backfill (shape precedent: [20260914103423-add-sample-published-at.ts](packages/api/migrations/20260914103423-add-sample-published-at.ts)).
- `packages/api/src/db.ts`: `doi_prefix: string | null` on `SampleTable`.
- `packages/domain/src/sample/sample.ts`: `doiPrefix: z.string().nullable().default(null)` next to `igsn`, and like `igsn` kept out of `createSampleSchema` (system field, never form input, so no `published-field-lock` entry: the lock maps are keyed on `CreateSample`).
- `packages/api/src/sample/service/to-sample.ts:271`: `doiPrefix: row.doi_prefix` next to `igsn`. `selectSample` is `selectAll`, so no query change.
- `packages/api/scripts/seed.ts`, in `insertSamples` where `publication_year` and `published_at` are already stamped: `doi_prefix: hasPermanentIgsn({ status }) ? SEED_DOI_PREFIX : null`. One line gives `seed`, `seed:demo` and `seed:e2e` a dummy DOI.

## Computing the DOI (domain)

New `packages/domain/src/sample/core/sample-doi.ts`, no I/O, sibling of `sample-landing-page.ts`:

```ts
sampleDoi(igsn: string, prefix: string): string   // "10.5072/0G8ZK..."
```

The bare DOI name is what the DataCite API takes and returns, so it is the one form we carry, exactly as `sampleIdentifier` carries the bare IGSN next to the `landingPage` URL. The resolvable form is `https://doi.org/` + that value, built at display time if a page ever shows it.

The DOI travels with the sample rather than through configuration, so it enters at the Core pivot and every consumer downstream is unchanged:

- `packages/domain/src/sample/core/core-sample-schema.ts`: `doi` added to `coreIdentificationFields`, `.optional()` with a `.meta({ description })` (the openapi spec fails without one), and listed in the `coreSampleBodySchema` override next to `sampleIdentifier` / `landingPage` so it is documented as emit-only on input.
- `packages/domain/src/sample/core/to-core-sample.ts`: `doi: sample.doiPrefix ? sampleDoi(igsn, sample.doiPrefix) : undefined`.
- `packages/domain/src/sample/datacite/to-datacite-sample.ts`: `doi: identification.doi ?? identification.sampleIdentifier`. The fallback keeps pre-existing samples emitting a valid document, and `toDataCiteSample` keeps its single argument, so the `/service` list mapping is untouched.

## Registration (api)

New `packages/api/src/datacite/`:

- `config.ts`: `dataCiteConfig(env = process.env)` returning `{ host, key, prefix } | null` (null when `DATACITE_API_HOST` is unset), the injectable-env pattern of [app-url.ts](packages/api/src/app-url.ts).
- `register-doi.ts`: `registerDoi(sample: Sample, event: "publish" | "register"): Promise<void>`.
  - Returns immediately when `dataCiteConfig()` is null or the sample carries no `doiPrefix`.
  - `PUT ${host}/dois/${doi}` with `Authorization: Bearer ${key}`, body `{ data: { type: "dois", attributes: { ...toDataCiteSample(toCoreSample(sample, appUrl("FRONTEND_URL"))), event } } }`; the `doi` attribute is already the bare name from the mapping above, so the payload needs no override.
  - `signal: AbortSignal.timeout(...)`, since the call runs inside a DB transaction.
  - Non-2xx or network error: `console.error` with the response body, then `throw new HTTPException(502, ...)` from `hono/http-exception`, so the route answers 502 rather than the generic 500 of `app.ts`'s `onError`.
  - `PUT` is idempotent (creates or updates), so a retried publish re-sends the same DOI harmlessly.

## Hooking it into the publish (api)

`packages/api/src/sample/service/publish-sample.ts` only:

- the existing `UPDATE` also sets `doi_prefix` to `coalesce(doi_prefix, <prefix>)`, the prefix read from `dataCiteConfig()`, so a re-publish keeps the prefix it was registered under, like `publication_year` and `published_at` already do;
- after the read-back, `await registerDoi(sample, status === "published" ? "publish" : "register")`.

A throw propagates out of `withTransaction`, the transaction rolls back, and the sample stays a draft with no IGSN and no prefix.

Direct module import, no plumbing: `repository.ts`, `admin-routes.ts`, `service-routes.ts` and `app.ts` stay as they are, and api specs keep publishing normally since the env is unset there. A `ponytail:` comment records the tradeoff: the row stays locked for the DataCite round trip, and a commit failure after a successful PUT leaves a registered DOI that the next attempt re-PUTs.

`packages/api/test/setup.ts`: clear `DATACITE_*` in `beforeEach`, alongside the other env overrides.

No UI: neither admin nor the public sample page shows the DOI, and `withdrawn-sample.ts` keeps its whitelist as is, so a withdrawn sample does not expose it publicly. Not asked for, add when someone needs to read it.

## Mock DataCite (dev + e2e)

- New repo-root `datacite-mock/Caddyfile` served by a `datacite:` service on the `caddy:2-alpine` image already in every stack, mounted read-only like `infra/Caddyfile`. It answers `PUT /dois/*` with `201` and a small JSON body, everything else `404`. No new image, no Dockerfile, no dependency.
- `docker-compose.dev.yml` and `docker-compose.e2e.yml`: that service, plus on `api` `DATACITE_API_HOST: http://datacite:8080`, `DATACITE_API_KEY: "dev"`, `DATACITE_DOI_PREFIX: "10.5072"` (DataCite's test prefix). e2e publishes through the UI ([e2e/admin/samples.spec.ts:103](e2e/admin/samples.spec.ts#L103)), so `api` gets a `depends_on` on the mock.
- `infra/preprod/docker-compose.yml`: the three vars as `${DATACITE_API_HOST}` / `${DATACITE_API_KEY}` / `${DATACITE_DOI_PREFIX}` on `api`, no mock service (preprod runs no keycloak or maildev either).
- `infra/preprod/docker-compose.env.example`: the three, documented, including that an unset host disables registration and that publishing answers 502 when DataCite refuses.

## Tests (TDD)

- `domain` `core/sample-doi.spec.ts`: `sampleDoi("IGSN", "10.5072")` is `10.5072/IGSN`, and a prefix with a trailing slash or a leading `doi:` is not silently doubled.
- `domain` `core/to-core-sample.spec.ts`: `identification.doi` from the snapshotted prefix, absent without one.
- `domain` `datacite/to-datacite-sample.spec.ts`: `doi` is the bare DOI name when Core carries one, the bare IGSN otherwise; `"identification.doi"` added to `PROJECTED_CORE_PATHS`.
- `api` `src/datacite/register-doi.spec.ts` (new, `vi.stubGlobal("fetch", ...)` like [active-session.spec.ts](packages/api/src/auth/active-session.spec.ts)): no call when unconfigured or without a prefix; PUT to `${host}/dois/${prefix}/${igsn}` with the bearer header and `event: "publish"`, `event: "register"` for a withdrawn publish; throws a 502 `HTTPException` on a non-2xx and on a network error.
- `api` `publish-sample.spec.ts`: stamps `doiPrefix` when configured, leaves it null when not, keeps the original prefix on a re-publish, and a failing registration leaves the sample `draft` with `igsn` null (rollback).
- `api` `admin-routes.spec.ts`: `POST /publish` answers 502 and the sample is still a draft when DataCite refuses.
- No new e2e spec: the mock only keeps the existing publish e2e green.

## Fixtures and drift (a new field on `sampleSchema`)

Rule applied everywhere: **a fixture sample that carries an IGSN carries a `doiPrefix`**, so every published fixture shows a real DOI in the Core and DataCite expectations.

- `packages/api/scripts/seed.ts`: the `insertSamples` stamp above, so `Basalt 42`, `Granite 7`, the withdrawn and the tombstone rows, and every published demo row, land with `doi_prefix`. The e2e seed contract (`e2e/support/db.ts`) reads the same rows.
- `domain/src/sample/core/{core-sample-fixture,core-record-fixture,core-sample-variant-fixture}.ts` and `frontend/test/published-sample.ts`: a prefix beside each non-null `igsn`, which turns the existing expectations into DOI assertions.
- The one deliberate exception is the legacy `CNRS1234567890` fixture (`core-sample-fixture.ts:347`): it stays prefix-less as the pre-existing-sample case, and is what covers the bare-IGSN fallback.
- `admin/test/fake-sample.ts` has `igsn: null`, so it stays `doiPrefix: null`.

`.default(null)` keeps untyped fixtures compiling; typed `Sample` literals and exact-shape guards still need the field spelled out: `domain/src/sample/sample.spec.ts`, `api/src/sample/service/to-sample.spec.ts`, `domain/src/sample/publication/{sample-publish-blockers,published-field-lock,withdrawn-sample}.spec.ts`, `admin/src/samples/{to-sub-sample-defaults,to-duplicate-defaults,parent-field-suggestions}.spec.ts`.
Plus `domain/src/sample/core/core-round-trip.spec.ts` `UNMAPPED_SAMPLE_FIELDS` (+`"doiPrefix"`).

## Docs

- `docs/datacite-mapping.md`: the `doi` row becomes `identification.doi` (bare DOI name, as the DataCite API carries it), with the IGSN fallback for a sample that has no snapshotted prefix.
- `docs/igsn-core-mapping.md`: `identification.doi` in the identification table, emit-only.
- New `docs/adr/0044-doi-registration-on-publication.md`: snapshotting the prefix instead of storing the DOI, refusing to publish when registration fails, hooking `publishSample` so every snapshotted prefix is registered, skipping when unconfigured, and the HTTP-inside-a-transaction tradeoff.

## Verification

1. `pnpm test --project @projet-igsn/domain` and `--project @projet-igsn/api` (the api project applies the new migration automatically).
2. `pnpm lint:check` (the type gate; the drift above fails here if missed).
3. `make dev`, publish a draft sample in admin, then `curl -H 'Accept: application/vnd.otelo.datacite+json' .../api/service/samples/<igsn>` with a service-account key and check `doi` is `10.5072/<igsn>`; `docker logs` on the mock shows the `PUT /dois/10.5072/<igsn>`.
4. Stop the `datacite` container and publish again: 502, and the sample is still a draft.
5. `make test-e2e` once, at the end.
