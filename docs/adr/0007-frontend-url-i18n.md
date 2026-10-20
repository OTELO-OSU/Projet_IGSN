# 0007. Frontend i18n by localized URL

## Status

Accepted

## Context

`frontend` is public and indexed, so search engines must see one canonical page per route and visitors must land in their own language. `admin` is authenticated and unindexed, so paraglide with a single `en` locale and no URL localization is enough there. `en` and `fr` ship.

## Decision

Localize by URL with paraglide's `url` strategy on TanStack Start (SSR).

- Every route carries a locale prefix (`/en/...`) and path segments are translatable per locale. `urlPatterns` lists one entry per route in `src/i18n/paraglide.ts`, the options object the Vite plugin and the compile CLI share, so a new route needs its entry added by hand. Each entry carries an `en` and a `fr` pair, slugs staying English, and each locale has its `messages/{locale}.json`.
- `strategy: ["url", "cookie", "preferredLanguage", "baseLocale"]`: bare `/` carries no URL locale, so `paraglideMiddleware` (`src/server.ts`) resolves it by cookie, then `Accept-Language`, then `en`, and redirects to the prefixed URL.
- The router `rewrite` (`input: deLocalizeUrl`, `output: localizeUrl`) keeps the route tree locale-agnostic. The server entry passes the original `req` to the middleware, not the callback's `request`, to avoid a double-delocalize redirect loop.
- `__root.tsx` sets `<html lang>` from `getLocale()` and emits an absolute `<link rel="canonical">` at the current locale's URL, one absolute `hreflang` alternate per locale and `x-default` at `en`, all built with `FRONTEND_URL`.
- The header EN / FR toggle (`src/i18n/locale-switch.tsx`) calls paraglide's `setLocale`, which writes the `PARAGLIDE_LOCALE` cookie and reloads at the localized URL.

## Consequences

- Each locale's page is its own canonical, with hreflang alternates linking the variants, and visitors are redirected to their language from `/`.
- A further locale is a data change (a locale column plus a message file), not a rearchitecture.
- Extends ADR 0005: `frontend` reads the shared domain message file through the array `pathPattern`.
