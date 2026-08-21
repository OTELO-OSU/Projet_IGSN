# 0005. Shared i18n message file for controlled vocabularies

## Status

Accepted

## Context

Controlled-vocabulary labels are needed by both `admin` and `frontend`. Paraglide compiles the `m` object per app, so the resolver mapping a code to a message must stay in each app. The leak is the string values: copying them into each app's `messages/{locale}.json` lets them drift.

## Decision

Keep the shared vocabulary strings once, in `packages/design-system/messages/{locale}.json`, the package both apps already depend on. Each app's inlang project reads its own file plus the shared one through an array `pathPattern`:

    "plugin.inlang.messageFormat": {
      "pathPattern": [
        "./messages/{locale}.json",
        "../design-system/messages/{locale}.json"
      ]
    }

App-specific keys stay in the app's own file. `@inlang/plugin-message-format@4` types `pathPattern` as `string | string[]`, so merging files is a first-class feature, not a workaround. The per-app label resolvers are unchanged: an exhaustive `Record` over the vocabulary still fails to compile when a code is added untranslated.

## Consequences

- One source of truth for shared vocabulary strings, with no hand-copying between apps.
- Shared keys must be globally unique across the merged files; a collision between an app file and the shared one is a conflict to avoid.
