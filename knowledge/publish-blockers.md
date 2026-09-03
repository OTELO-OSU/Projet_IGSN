---
type: domain-model
title: Publish blockers
description: >-
  samplePublishBlockers is the single place stating why a sample cannot be
  published; the api guard and the admin tooltip both derive from it.
resource: packages/domain/src/sample/publication/sample-publish-blockers.ts
tags:
  - domain
  - sample
  - publication
relations:
  - type: depends_on
    target: zod-single-source-of-truth
status: stable
---

Why a sample cannot be published lives in ONE place, `samplePublishBlockers` (`domain/sample/publication/sample-publish-blockers.ts`).

- The api publish guard and the admin publish tooltip both derive from it.
- Adding a constraint is one code in `publishBlockerSchema` plus one push in `samplePublishBlockers`.
- The admin label map (`publish-blocker-label.ts`) is an exhaustive `Record<PublishBlocker, () => string>`, so it fails to compile until the new reason is translated.
- Example codes: `material_missing`, `material_incomplete`, `location_position_missing`.
- A whole family of blockers may be gated on the material, the seven `synthetic_*` codes applying to a synthetic sample alone ([[synthetic-details]]).
- On editing a published sample the api blocks only NEW blockers, comparing before and after the merge and answering 409, so a record already broken (DB tampering, a new constraint) stays repairable by script. The admin form instead validates the draft strictly against `publishedSampleSchema`, which is where a researcher sees the record no longer meets the bar.
- Publish completeness is bypassed on import ([[legacy-import]]): legacy rows land `published` with sparse data, so the public app tolerates a published sample missing required fields.
- Two e2e and seed fixtures must follow every new blocker: the e2e `fillPublishableFields` helper and the published rows of `make db-seed-demo`.
