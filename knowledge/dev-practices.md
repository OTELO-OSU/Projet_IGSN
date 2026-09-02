---
type: practice
title: Development practices
description: >-
  Laziest solution that works, docs read through Context7, dependencies only
  with explicit approval, ADRs only for costly-to-reverse decisions.
resource: CLAUDE.md#practices
tags:
  - practice
  - process
relations:
  - type: depends_on
    target: commands-and-services
status: stable
---

- **Laziest solution that works** (the `ponytail` skill): YAGNI, stdlib and native platform features before dependencies, the shortest correct diff. Deliberate shortcuts carry a `ponytail:` comment naming the ceiling and the upgrade path.
- **Read a package's docs with Context7 before using or configuring it**, never from memory.
- **Never add a dependency without explicit go-ahead.** Climb the ladder first (stdlib, native feature, an already-installed dependency); if a library still seems warranted, present the no-library option against one or two candidates and wait for a decision. Asking first is not licence to hand-roll: when the alternative is hundreds of lines re-implementing something hard to get right (date math, crypto, parsing, validation), a maintained library is the lazy choice.
- **Skills for recurring changes**: `add-sample-vocabulary` for a vocabulary value, `add-domain-entity` then `add-admin-component` for a form field, `add-api-endpoint`, `add-search-facet`, `add-shadcn-component`, `kysely-vitest-postgres`, `cleanup-comments`, `cleanup-tests`.
- **ADRs** (`docs/adr/XXXX-kebab-title.md`, one decision per file, zero-padded incrementing) record only a decision costly to reverse that constrains future work: a new cross-package boundary, a persistence or auth model, a public contract, or a tradeoff where the rejected option was reasonable. Skip it for routine choices local to one file or cheap to change; when in doubt, no ADR, a rule or code comment being enough.
- **Writing style** for every rule, agent, skill and doc: concise, one point per sentence, no em dashes, a list rather than a paragraph, no hard-wrapped sentences. Editing a rule means rewording the wrong bullet, never adding a second one qualifying it.
- **Comments** carry a business rule, a `ponytail:` marker, a temporary TODO or a tool directive; narration, restated code, changelog comments and commented-out code get deleted. Standard HTML or spec behaviour is not a comment-worthy why.
- A logic change that leaves a stale name gets the rename in the same commit.
- Testing: [[testing-strategy]]. Commands: [[commands-and-services]].
