---
type: practice
title: i18n strategy
description: >-
  Vocabularies are stored as codes and translated in domain; coverage fails the
  build, and the api mails resolve with i18next instead of Paraglide.
resource: .claude/rules/i18n.md
tags:
  - i18n
  - domain
  - practice
relations:
  - type: depends_on
    target: package-layering
status: stable
---

No user-facing string is hardcoded: every label, message and error goes through the translation layer.

**Controlled vocabularies are codes, not labels.** Values are stable `lower_snake_case` machine codes. Translation keys are prefixed with the enum name (`nature_hand_sample`), app catalogs merging into one namespace, and a code reused under several tree parents shares one key.

**Shared enum translations live in `domain`.** A vocabulary is domain data, so both its text and its resolving logic live there, never in `design-system` or an app.

- Text in `packages/domain/messages/{locale}.json`, merged into each app through its `project.inlang/settings.json` array `pathPattern` (`@inlang/plugin-message-format@4` types `pathPattern` as `string | string[]`, so merging is a first-class feature). Shared vocabulary strings also live in `packages/design-system/messages/{locale}.json` for what both apps read.
- Shared keys must stay globally unique across the merged files.
- The resolver is written once (`sample/create-sample-labels.ts`) and takes `m` as a parameter, Paraglide compiling a separate `m` per app; each app binds its own `m` in one line, never copying the resolver.
- App-only copy backed by no shared enum stays in that app's catalog.
- The api's mail copy lives in `packages/api/messages/{locale}.json` and resolves with i18next, the api having no build step to generate a runtime into. `packages/api/src/mail/i18n.ts` owns the single `createInstance()`, and `declare module "i18next"` types the keys so an unknown key fails `tsc`. Its `escapeValue: false` is deliberate, each mail rendering twice as plain text and MJML, so user-supplied values are escaped with `escapeHtml` where they are injected into the MJML.

**Coverage is enforced at compile time**: a missing translation fails the build rather than rendering a raw key. Flat vocabularies use a key assertion type or a `Record<Code, () => string>` map; tree vocabularies, whose paths are runtime strings, are covered by a spec walking every path and failing on a label equal to its own key.

All test content is in English. URL localization is [[frontend-url-i18n]].
