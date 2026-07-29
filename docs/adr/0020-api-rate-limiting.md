# 0020. API rate limiting: in-process counters, edge-forwarded client IP

Date: 2026-07-29

## Status

Accepted.

## Context

The api had no rate limiting, and `rate-limiter-flexible` was already an unused
dependency. One Hono app, one preprod container, no Redis. `/samples` is public,
`/admin` is behind `requireAuth`. Preprod is Cloudflare, Caddy, then the
containers, and the frontend server-renders, so every page view calls the api.

Two costly-to-reverse decisions: counter storage, and how the api learns the
real client IP across three hops it does not control end to end.

## Decision

**In-process counters.** `RateLimiterMemory`, one instance per limited route.
Rejected `RateLimiterRedis`: no Redis in the stack and one api container, so a
shared store adds infrastructure a single process does not need. Counters
therefore reset on restart, and a second replica would double every budget;
upgrade path is swapping in `RateLimiterRedis` behind the same interface.

**Client IP from a header, trusted behind the edge.** The api only ever sees
Caddy's socket address, so the real IP travels a chain, each hop adding trust:

1. **Cloudflare** sets `Cf-Connecting-IP`.
2. **Caddy** (`infra/preprod/Caddyfile`) reads it via `client_ip_headers` and
   re-emits `X-Real-IP` through the `(realip)` snippet, imported by every site.
3. **Frontend SSR** (`src/server.ts`) stores the inbound `X-Real-IP` in an
   `AsyncLocalStorage`; `apiFetch` relays it outbound, billing the visitor.
4. **The api** reads `X-Real-IP` only when `TRUST_PROXY_HEADERS=true`, else
   falls back to the socket peer address (`getConnInfo`).

Drop step 2 and the api never sees a real IP; drop 3 and SSR views bill the
frontend container; drop 4 and every visitor shares one bucket.

Rejected: pasting Cloudflare's CIDRs in the Caddyfile instead of trusting
`0.0.0.0/0`. `infra/preprod/tf/ec2.tf` fetches that list live for the security
group; a static second copy rots when Cloudflare rotates ranges.

## Trust dependencies

- `trusted_proxies static 0.0.0.0/0 ::/0` is sound only while `ec2.tf`
  restricts 80/443 to Cloudflare's ranges. Loosen that and `Cf-Connecting-IP`
  becomes spoofable.
- `TRUST_PROXY_HEADERS` is mandatory in preprod, or `/samples` gets a site-wide
  50/min cap instead of a per-visitor one.
- `ec2.tf` fetches only `ips-v4`, so `::/0` is trusted but unreachable. IPv6 is
  closed by accident; adding an IPv6 rule later opens the spoof silently.

## Corrections to the original plan

1. `c.req.routePath` resolves from the running handler, so inside `.use("*")`
   it is `/*`, never `/samples/:igsn`, and every lookup misses silently. The
   middleware keys the registry on method plus `matchedRoutes(c).at(-1)`.
2. `trusted_proxies_strict` must not be set alongside `trusted_proxies static
0.0.0.0/0`: with every hop trusted it walks past the visitor's address and
   `{client_ip}` degrades to Caddy's own. Verified on `caddy:2-alpine`.
3. SSR must reach the api over the compose network (`http://api:8080`).
   Hairpinning via the public URL sends it back through Caddy, which overwrites
   the forwarded `X-Real-IP` with the host's address.
4. `getConnInfo` throws under `hono/testing` (`c.env` undefined), and
   `RateLimiterRes` is not an `Error`, so `compose` rethrows it past `onError`
   and `app.fetch` rejects instead of returning 429. Both guarded.

## Budgets

| scope        | key(s)                                                                        | default   |
| ------------ | ----------------------------------------------------------------------------- | --------- |
| public, IP   | `SAMPLES_LIST`, `SAMPLES_GET`, `SAMPLES_ATTACHMENT_GET`                       | 50 / 60s  |
| admin, `sub` | `ADMIN_ME`, `ADMIN_SAMPLES_LIST`, `ADMIN_SAMPLES_GET`, `ADMIN_ATTACHMENT_GET` | 100 / 60s |
| admin writes | `ADMIN_SAMPLES_CREATE`, `ADMIN_SAMPLES_UPDATE`, `ADMIN_SAMPLES_PUBLISH`       | 30 / 60s  |
| uploads      | `ADMIN_ATTACHMENT_CREATE`                                                     | 20 / 60s  |

Uploads get their own budget: a 100 MB body on the database volume is a
different risk from a row write. All budgets are overridable per route via
`RATE_LIMIT_<KEY>_POINTS` / `_DURATION`.

## Known limits, each a separate ticket

- `Cf-Connecting-IP` is leftmost-wins, so `1.2.3.4, 203.0.113.7` resolves to
  the attacker's value. Only the security group and Cloudflare's own header
  overwrite prevent it today; the fix is deploy-time CIDRs plus strict mode.
- 20 uploads/min prices disk exhaustion, it does not prevent it: 2 GB/min per
  user against a 20 GB volume shared with `pgdata`. Needs a quota or a separate
  volume. The 429 fires before the body is parsed, so a refusal writes nothing.
- A 429 during SSR renders a bare error boundary and a 500, no `Retry-After`.
- Unauthenticated `/admin/*`, 404 floods, and CORS preflights are uncapped.
  All DB-free, but `requireAuth` runs JWKS verification, so a 401 costs CPU.
