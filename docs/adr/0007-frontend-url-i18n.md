# 0007. Frontend i18n by localized URL

## Status

Accepted

## Context

`frontend` is public and indexed, so search engines must see one canonical page per route and visitors must land in their own language. `admin` is authenticated and unindexed, so paraglide with a single `en` locale and no URL localization is enough there. Only `en` ships today, but adding `fr` must not require re-plumbing.

## Decision

Localize by URL with paraglide's `url` strategy on TanStack Start (SSR).

- Every route carries a locale prefix (`/en/...`) and path segments are translatable per locale. `urlPatterns` lists one entry per route in `src/i18n/paraglide.ts`, the options object the Vite plugin and the compile CLI share, so a new route needs its entry added by hand. Adding `fr` is one localized pair per entry plus `messages/fr.json`.
- `strategy: ["url", "cookie", "preferredLanguage", "baseLocale"]`: bare `/` carries no URL locale, so `paraglideMiddleware` (`src/server.ts`) resolves it by cookie, then `Accept-Language`, then `en`, and redirects to the prefixed URL.
- The router `rewrite` (`input: deLocalizeUrl`, `output: localizeUrl`) keeps the route tree locale-agnostic. The server entry passes the original `req` to the middleware, not the callback's `request`, to avoid a double-delocalize redirect loop.
- `__root.tsx` sets `<html lang>` from `getLocale()` and emits `<link rel="canonical">` at the `en` variant of the current path via `localizeHref(path, { locale: "en" })`.

## Consequences

- One canonical English URL per route for search engines, and visitors are redirected to their language from `/`.
- Shipping `fr` is a data change (a locale column plus a message file), not a rearchitecture.
- Extends ADR 0005: `frontend` reads the shared design-system message file through the array `pathPattern`.
