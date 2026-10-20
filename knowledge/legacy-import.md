---
type: feature
title: Legacy IGSN dump import
description: >-
  The legacy samples arrive as a pg_dump already shaped to our schema, keeping
  their CNRS/TOAE identifiers, loaded with psql and validated by report.
resource: docs/adr/0027-legacy-dump-import.md
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

The previous registry (a Django app) held ~26,400 geological samples with already-citable IGSNs (`CNRS##########` or `TOAE##########`). They now arrive as a pg_dump of our own tables (`legacy_data/*.sql`, untracked, one file per table), reworked upstream to our data model; the in-repo import script and its mapping were removed on 2026-10-20 (ADR 0027 superseded).

- **Legacy IGSNs are real IGSNs**: the old `resourceIdentifier` sits verbatim in `sample.igsn`. `igsnSchema` accepts both forms on read while minting stays strict ([[igsn-identifier]]).
- **The dump is the contract**: it is loaded with `psql` in foreign-key order (`user`, `location`, `location_vertical_position`, `sample`, `sample_parent`, `user_sample`, `sample_additional_role`, `sample_relation`); a row the schema or a trigger refuses is a defect reported back to the dump owner, never patched locally.
- **The dump must not reset `search_path`**: the sample trigger functions resolve `sample` and `location` through it, so the `set_config('search_path', '', false)` line pg_dump emits is removed from the dump before loading.
- **Legacy rows land `withdrawn` with sparse data** and will be published later, so the public app tolerates a permanent-IGSN sample missing required fields ([[publish-blockers]]); the DataCite re-sync and the move to `published` need the dump to fill `nature`, `type`, `existence_status`, `availability_status` and `published_at` first.
- **Validation before a load** runs every row through the api read path (`selectSample` + `toSample`), `toPublicSample`, `toCoreSample` and `samplePublishRequirements`, plus the admin and public pages against the dev stack; the findings go to the dump owner as a report.
- Some legacy detail is deliberately lost upstream, so recovering it later means new fields, not a different mapping.
