---
type: practice
title: Zod schemas as the single write contract
description: >-
  createSampleSchema in domain is the one write contract; the admin form has no
  schema of its own and required means required to publish.
resource: packages/domain/src/sample/sample.ts
tags:
  - domain
  - validation
  - forms
relations:
  - type: depends_on
    target: publish-blockers
status: stable
---

Every rule about a sample lives once in `domain` as a Zod schema, and both the form and the api validate against it.

- The write contract is `createSampleSchema` (`packages/domain/src/sample/sample.ts`), composed of one sub-schema per characteristic.
- The admin form holds a flat draft; `composeCreateSample` (`packages/admin/src/samples/sample-draft-schema.ts`) validates it against that same schema, so the form has no schema of its own.
- "Required" means required to publish, not to save: a half-filled draft saves. Publish requirements live in [[publish-blockers]], never in the draft schema.
- The api re-validates at the trust boundary whatever the client already checked.
- Adding a field or a value starts in `domain`; see [[sample-form-update-guide]].
