# 0027. Importing the legacy IGSN dump

Date: 2026-07-24

## Status

Accepted

## Context

The previous registry (a Django app) holds ~24,910 geological samples, each with an already-assigned, citable IGSN (`CNRS##########` or `TOAE##########`). Its `pg_dump` (`bdd-igsn.sql`, gitignored) must land in the new database so those samples are browsable alongside newly-declared ones.

The two schemas differ sharply: the old side is one wide `igsn_resource` table plus many lookup tables, the new side is `sample` with vocabularies stored as domain codes and ltree paths validated by Zod, and no sub-sample hierarchy. Two facts force decisions that constrain the code:

- The new `igsn` column normally holds a 26-char Crockford base32 suffix derived from the sample UUID; a legacy IGSN does not fit that format.
- A sample is publishable only when it clears every publish blocker, and most legacy rows are too sparse to qualify.

## Decision

**Legacy IGSNs are real IGSNs.** The old `resourceIdentifier` is stored verbatim in `sample.igsn` and the sample is `published`, treated no differently from a natively-minted one. No separate `legacy_igsn` column.

**Validation is lax on read, strict on mint.** `igsnSchema` accepts either a minted 26-char suffix or a legacy identifier (`CNRS`/`TOAE` plus 10 digits), and is used wherever a stored IGSN is read or looked up. The import validates each identifier with the same schema before storing it, so a stored IGSN is always one the read path can look up. Minting still emits the strict format, so `igsnSuffixSchema` stays strict.

**Publish completeness is bypassed on import.** Rows are inserted as `published` with their IGSN directly, validated only for data validity (`createSampleSchema`), never against the publish-blocker bar. Legacy data predates the new required fields, and a row missing them is still a real published sample.

**The import is idempotent.** `scripts/import-legacy.ts` reads the dump from a throwaway `legacy_import` database (loaded by `make db-import-legacy`, dropped after) and upserts on `igsn`, so a rerun updates in place, preserving the row's `id` and `created_at`.

**Legacy owners become users.** Each imported sample keeps its owner, reached through `igsn_personnehasresource` to `igsn_personne` to `auth_user`, exactly one owner per sample in the dump. The owner's email and names land in `user`, upserted by email, with a `user_sample` link; an account owning no imported sample is not created, and credentials, username and Django flags are dropped, authentication having moved to Keycloak. The owner is not the collector, which stays a free-text field on the sample.

**A value we cannot place skips the whole sample.** Every field the import feeds through one of our enums or controlled lists (material, collection method, resource type, country, navigation type, and the size, elevation and age units) either normalizes into that enum or the sample is skipped: we never store a value outside the enum, which would defeat it, and never publish a sample that silently lost one. Vocabulary values are slugged (CamelCase and `>` into snake_case and `.`) and kept only if the resulting path exists in the domain tree, taking the longest valid prefix.

**The material path must match the start of a supported path**, that is a valid node in the new tree, complete or not, or a coarse root when the source knew no finer type. A genuinely coarse source imports, since its path is a valid prefix; a leaf the new tree spells differently or seats elsewhere is remapped by hand through `MATERIAL_SPECIALS`, keyed to the path the geologist's mapping instructions assign it. Everything else is skipped, including the values the expert table marks "record to review". Truncating to a coarser path would assert a classification the source did not, and publishing an under-classified sample is worse than waiting.

**Private rows and sub-samples are ignored**, the first because they would otherwise be published, the second because the new schema has no hierarchy.

**Every skip is printed.** `unmappableValues` returns every offending value in a row, and the import prints each skip (IGSN, reason, offending value) to stdout, which `make db-import-legacy` tees to `import-legacy.log`, so the gaps to close before a re-import are visible.

Per-column detail is not restated here: `scripts/import-legacy-mapping.ts` is the executable mapping, and `docs/legacy-import-mapping.xlsx` lists every legacy column with its target or the reason it is dropped.

## Consequences

- Published imported samples can miss fields the publish flow requires, so the public app must tolerate a published sample with sparse data; it already renders every sub-block as nullable.
- IGSN validation is looser everywhere a stored IGSN is read. The strictness that matters, minting, is unaffected, and the DB `UNIQUE` on `igsn` still guards collisions, none existing in the dump.
- Reruns are safe and update in place, so the dump can be re-imported after a mapping fix without duplicating or renumbering samples, and skipped rows come back once the mapping supports their value.
- Some legacy detail is deliberately lost, so recovering it later means new columns or fields, not re-parsing the dump differently.
