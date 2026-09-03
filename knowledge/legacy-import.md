---
type: feature
title: Legacy IGSN dump import
description: >-
  An idempotent script upserts ~24,910 legacy samples as published rows keeping
  their CNRS/TOAE identifiers, skipping any row carrying a value it cannot map.
resource: packages/api/scripts/import-legacy.ts
tags:
  - import
  - legacy
  - data
relations:
  - type: depends_on
    target: igsn-identifier
  - type: depends_on
    target: vocabulary-tree
  - type: depends_on
    target: publish-blockers
status: stable
---

The previous registry (a Django app) holds ~24,910 geological samples with already-citable IGSNs (`CNRS##########` or `TOAE##########`), which must land in the new database and browse alongside newly-declared ones.

- **Legacy IGSNs are real IGSNs**: the old `resourceIdentifier` is stored verbatim in `sample.igsn` and the sample is `published`, with no separate `legacy_igsn` column. `igsnSchema` therefore accepts both forms on read while minting stays strict ([[igsn-identifier]]).
- **Publish completeness is bypassed**: rows insert as `published` validated only by `createSampleSchema`, never against the publish blockers, so the public app must tolerate a published sample with sparse data ([[publish-blockers]]).
- **The import is idempotent.** `scripts/import-legacy.ts` reads the dump from a throwaway `legacy_import` database (loaded by `make db-import-legacy`, dropped after) and upserts on `igsn`, preserving `id` and `created_at`, so a rerun after a mapping fix updates in place.
- **Legacy owners become users**, reached through `igsn_personnehasresource` to `igsn_personne` to `auth_user`, exactly one owner per sample. Email and names land in `user`, upserted by email, with a `user_sample` link; an account owning no imported sample is not created, and credentials, username and Django flags are dropped. The owner is not the collector, which stays a free-text field.
- **A value we cannot place skips the whole sample.** Every field feeding an enum or controlled list (material, collection method, resource type, country, navigation type, and the size, elevation and age units) either normalizes into it or the sample is skipped. Values are slugged (CamelCase and `>` into snake_case and `.`) and kept only if the resulting path exists in the domain tree, taking the longest valid prefix.
- **The material path must match the start of a supported path**, complete or not; a coarse source imports, a leaf the new tree spells differently is remapped by hand through `MATERIAL_SPECIALS`, and everything else is skipped, the "record to review" values included. Truncating to a coarser path would assert a classification the source did not.
- **Legacy DOI related resources become relations** typed `other` / `doi`, the DOI URL doubling as the target title and the citation kept as description when it differs, deduplicated by DOI; a value with no DOI in it is dropped, not a skip ([[sample-relations-attachments]]).
- **Private rows and sub-samples are ignored**, the first because they would otherwise be published, the second because the schema has no hierarchy.
- **Every skip is printed** (IGSN, reason, offending value), teed to `import-legacy.log` by `make db-import-legacy`, so the gaps to close before a re-import are visible.
- `scripts/import-legacy-mapping.ts` is the executable mapping; `docs/legacy-import-mapping.xlsx` lists every legacy column with its target or the reason it is dropped, and the geologist's screenshots plus `template_igsn_historique.xls` are the authority the mappings answer to.
- Some legacy detail is deliberately lost, so recovering it later means new fields, not re-parsing differently.
