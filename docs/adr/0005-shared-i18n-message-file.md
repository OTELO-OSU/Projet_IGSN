# 5. Shared i18n message file for controlled vocabularies

## Status

Accepted

## Context

Controlled-vocabulary labels (sample nature, and future ones) are needed by both
`admin` and `frontend`. Paraglide compiles the `m` object per app, so the
resolver that maps a code to `m.nature_*` must stay in each app (the i18n rule
already resolves labels per package). The leak is the string values: copying the
`nature_*` entries into each app's `messages/{locale}.json` lets them drift.

## Decision

Keep the shared controlled-vocabulary strings once, in
`packages/design-system/messages/{locale}.json` (the package both apps already
depend on). Each app's inlang project reads its own file plus the shared one via
an array `pathPattern`:

    "plugin.inlang.messageFormat": {
      "pathPattern": [
        "./messages/{locale}.json",
        "../design-system/messages/{locale}.json"
      ]
    }

App-specific keys stay in the app's file; shared vocabulary lives only in
design-system. The per-app `nature-label.ts` resolver is unchanged: its
`Record<Nature, () => string>` still fails to compile if a code is added
untranslated.

`@inlang/plugin-message-format@4` types `pathPattern` as `string | string[]`, so
merging multiple files is a supported first-class feature, not a workaround.

## Consequences

- One source of truth for shared vocabulary strings; no hand-copying between apps.
- `frontend` opts in by adding the same shared path to its inlang project when it
  gains i18n (it has none today); until then only `admin` consumes the file.
- Shared keys must be globally unique across the merged files; a collision
  between an app file and the shared file is a conflict to avoid.
