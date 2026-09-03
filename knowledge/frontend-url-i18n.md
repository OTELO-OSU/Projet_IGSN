---
type: feature
title: Frontend i18n by localized URL
description: >-
  The public frontend localizes by URL with paraglide's url strategy on TanStack
  Start; admin is exempt.
resource: packages/frontend/src/i18n/paraglide.ts
tags:
  - frontend
  - i18n
  - seo
relations:
  - type: depends_on
    target: i18n-strategy
status: stable
---

`frontend` is public and indexed, so it localizes by URL with paraglide's `url` strategy on TanStack Start (SSR). `admin` is authenticated, single-locale and unindexed, so it uses paraglide with no URL localization.

- Every route carries a locale prefix (`/en/...`) and path segments are translatable per locale. `urlPatterns` lists one entry per route in `src/i18n/paraglide.ts`, the options object the Vite plugin and the compile CLI share, so a new route needs its entry added by hand.
- `strategy: ["url", "cookie", "preferredLanguage", "baseLocale"]`: bare `/` carries no URL locale, so `paraglideMiddleware` (`src/server.ts`) resolves it by cookie, then `Accept-Language`, then `en`, and redirects to the prefixed URL.
- The router `rewrite` (`input: deLocalizeUrl`, `output: localizeUrl`) keeps the route tree locale-agnostic. The server entry passes the original `req` to the middleware, not the callback's `request`, to avoid a double-delocalize redirect loop.
- `__root.tsx` sets `<html lang>` from `getLocale()` and emits `<link rel="canonical">` at the `en` variant of the current path.
- Only `en` ships today; adding `fr` is one localized pair per `urlPatterns` entry plus `messages/fr.json`, a data change rather than a rearchitecture.
