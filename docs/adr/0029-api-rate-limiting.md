# 0029. API rate limiting: in-process counters, edge-forwarded client IP

Date: 2026-07-29

## Status

Accepted

## Context

The api had no rate limiting, and `rate-limiter-flexible` was already an unused dependency. One Hono app, one preprod container, no Redis. `/samples` is public and `/admin` is behind `requireAuth`. Preprod is Cloudflare, then Caddy, then the containers, and the frontend server-renders, so every page view calls the api.

Two costly-to-reverse decisions: counter storage, and how the api learns the real client IP across three hops it does not control end to end.

## Decision

**In-process counters.** `RateLimiterMemory`, one instance per mount. `RateLimiterRedis` was rejected: with no Redis in the stack and one api container, a shared store adds infrastructure a single process does not need. Counters therefore reset on restart and a second replica would double every budget; the upgrade path is swapping in `RateLimiterRedis` behind the same interface.

**One limiter per mount, not per route.** `publicSampleRoutes` gets the IP limiter and `adminRoutes` the user limiter, each wired with `.use("*")` ahead of the routes it wraps, so every request under a mount shares one budget and there is no per-route table to keep in sync.

| scope             | key       | default   |
| ----------------- | --------- | --------- |
| public `/samples` | client IP | 50 / 60s  |
| admin `/admin`    | JWT `sub` | 100 / 60s |

100/60s folds the former ADMIN, WRITE and UPLOAD tiers into one constant (`AUTHENTICATED_USER_BUDGET` in `packages/api/src/rate-limit/config.ts`), tuned there and not per route. The healthcheck sits outside both mounts and is unlimited. `RATE_LIMIT_ENABLED` and `TRUST_PROXY_HEADERS` are the only env knobs; the budgets themselves are not env-configurable.

**Client IP from a header, trusted behind the edge.** The api only ever sees Caddy's socket address, so the real IP travels a chain, each hop adding trust:

1. **The infra proxy** sets `X-Forwarded-For`.
2. **Caddy** (`infra/stack/Caddyfile`) trusts private ranges only (`trusted_proxies_strict`), resolves the client IP from that header and re-emits `X-Real-IP` through the `(realip)` snippet, imported by every site.
3. **Frontend SSR** (`src/server.ts`) stores the inbound `X-Real-IP` in an `AsyncLocalStorage`, and `apiFetch` relays it outbound, billing the visitor.
4. **The api** reads `X-Real-IP` only when `TRUST_PROXY_HEADERS=true`, else falls back to the socket peer address (`getConnInfo`).

Drop step 2 and the api never sees a real IP; drop 3 and SSR views bill the frontend container; drop 4 and every visitor shares one bucket.

Originally preprod sat behind Cloudflare and trusted `0.0.0.0/0`, sound only while the security group admitted Cloudflare alone. Preprod and prod now run on Portainer with no Cloudflare, see [ADR 0002](0002-deploy-on-portainer-from-gitlab.md).

## Trust dependencies and known limits

- Caddy trusts private ranges only, so `HTTP_PORT` must be reachable from the infra proxy alone: a direct hit through Docker's userland proxy looks like a private peer, and its forged `X-Forwarded-For` would be trusted. See [deploy.md](../deploy.md).
- `TRUST_PROXY_HEADERS` is mandatory, or `/samples` gets a site-wide 50/min cap instead of a per-visitor one.
- The admin budget also covers uploads, so it prices disk exhaustion rather than preventing it: a 100 MB body costs the same one point as a row write. Needs a quota or a separate volume; the 429 fires before the body is parsed, so a refusal writes nothing.
- A 429 during SSR renders a bare error boundary and a 500, with no `Retry-After`.
- Unauthenticated `/admin/*`, 404 floods and CORS preflights are uncapped. All are DB-free, but `requireAuth` runs JWKS verification, so a 401 costs CPU.

Each is a separate ticket.

## Corrections found while implementing

- `trusted_proxies_strict` must not be set alongside `trusted_proxies static 0.0.0.0/0`: with every hop trusted it walks past the visitor's address and `{client_ip}` degrades to Caddy's own. Verified on `caddy:2-alpine`. The stack now trusts private ranges only, so strict mode is safe.
- SSR must reach the api over the compose network (`http://api:8080`). Hairpinning via the public URL sends it back through Caddy, which overwrites the forwarded `X-Real-IP` with the host's address.
- `getConnInfo` throws under `hono/testing` (`c.env` undefined), and `RateLimiterRes` is not an `Error`, so `compose` rethrows it past `onError` and `app.fetch` rejects instead of returning 429. Both guarded.
