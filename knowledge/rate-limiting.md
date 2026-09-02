---
type: infrastructure
title: API rate limiting
description: >-
  In-process counters, one limiter per mount, keyed on the edge-forwarded client
  IP for public reads and on the JWT sub for admin.
resource: packages/api/src/rate-limit/config.ts
tags:
  - api
  - security
  - infra
relations:
  - type: depends_on
    target: preprod-infrastructure
status: stable
---

**In-process counters**: `RateLimiterMemory` from the already-present `rate-limiter-flexible`, one instance per mount. No Redis in the stack and one api container, so counters reset on restart and a second replica would double every budget; the upgrade path is swapping in `RateLimiterRedis` behind the same interface.

**One limiter per mount, not per route**, wired with `.use("*")` ahead of the routes it wraps, so there is no per-route table to keep in sync:

| scope             | key       | default   |
| ----------------- | --------- | --------- |
| public `/samples` | client IP | 50 / 60s  |
| admin `/admin`    | JWT `sub` | 100 / 60s |

`AUTHENTICATED_USER_BUDGET` (`packages/api/src/rate-limit/config.ts`) is the one admin constant, tuned there and not per route. The healthcheck sits outside both mounts and is unlimited. `RATE_LIMIT_ENABLED` and `TRUST_PROXY_HEADERS` are the only env knobs, budgets are not env-configurable, an empty value counts as unset and a malformed one fails the api at boot naming the variable.

**Client IP travels a four-hop chain**, each hop adding trust ([[preprod-infrastructure]]):

1. Cloudflare sets `Cf-Connecting-IP`.
2. Caddy reads it via `client_ip_headers` and re-emits `X-Real-IP` through the `(realip)` snippet, imported by every site.
3. Frontend SSR (`src/server.ts`) stores the inbound `X-Real-IP` in an `AsyncLocalStorage` and `apiFetch` relays it outbound, billing the visitor rather than the container.
4. The api reads `X-Real-IP` only when `TRUST_PROXY_HEADERS=true`, else falls back to the socket peer (`getConnInfo`).

Drop step 2 and the api never sees a real IP; drop 3 and SSR views bill the frontend container; drop 4 and every visitor shares one bucket. `TRUST_PROXY_HEADERS=true` is mandatory in preprod.

**Trust dependencies and known limits**, each its own ticket:

- `trusted_proxies static 0.0.0.0/0 ::/0` is sound only while `ec2.tf` restricts 80/443 to Cloudflare's fetched ranges; loosen that and `Cf-Connecting-IP` becomes spoofable, being leftmost-wins. `trusted_proxies_strict` must NOT be set alongside it, or `{client_ip}` degrades to Caddy's own address.
- `ec2.tf` fetches only `ips-v4`, so `::/0` is trusted but unreachable; adding an IPv6 rule later opens the spoof silently.
- The admin budget also covers uploads, so it prices disk exhaustion rather than preventing it, though the 429 fires before the body is parsed.
- A 429 during SSR renders a bare error boundary and a 500, with no `Retry-After`.
- Unauthenticated `/admin/*`, 404 floods and CORS preflights are uncapped; all are DB-free, but `requireAuth` runs JWKS verification, so a 401 costs CPU.
- SSR must reach the api over the compose network (`http://api:8080`); hairpinning via the public URL lets Caddy overwrite the forwarded `X-Real-IP`.
