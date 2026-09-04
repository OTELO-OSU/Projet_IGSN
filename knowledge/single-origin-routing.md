---
type: infrastructure
title: Single origin, path-routed apps
description: >-
  Frontend, admin and api share one origin behind Caddy, the admin at /admin
  and the api at /api, in dev, e2e and preprod alike; only Caddy knows the
  topology.
resource: infra/Caddyfile
tags:
  - infra
  - deploy
  - admin
  - api
  - frontend
relations:
  - type: depends_on
    target: infra-parity-rule
  - type: depends_on
    target: preprod-infrastructure
  - type: depends_on
    target: auth-keycloak-gaiadata
  - type: depends_on
    target: mail-notifications
  - type: depends_on
    target: rate-limiting
status: stable
admin_mount_path: /admin
api_mount_path: /api
---

The three apps answer on one origin: the frontend at the root, the admin at `/admin`, the api at `/api`. Dev (http://localhost:3000), e2e (http://localhost:4000) and preprod (`https://igsn.$DOMAIN`) share that shape, so a path-prefix bug surfaces locally instead of at deploy.

- **Caddy is the only thing that knows the topology.** `infra/Caddyfile` serves dev and e2e as a `caddy` compose service in front of the three apps, none of which publishes a host port any more; `infra/preprod/Caddyfile` does the same behind Cloudflare with TLS and security headers ([[preprod-infrastructure]]). Both import the `(realip)` snippet on every proxy, so the rate limiter still sees the visitor's IP ([[rate-limiting]]).
- **The api is prefix-stripped** (`handle_path /api/*`), so it keeps no route prefix and its tests keep their bare paths.
- **The admin is not stripped** (`handle /admin/*`), because its Vite bundle is built with `base: "/admin/"`, so dev and prod serve identical paths. The prod image copies `dist` to `/srv/admin`, and its Caddyfile falls back to `/admin/index.html`; every admin healthcheck probes `/admin/`.
- Bare `/admin` and `/api` redirect to their trailing-slash form.
- **The admin router and OIDC follow `import.meta.env.BASE_URL`**: `createRouter` takes it as `basepath`, `redirect_uri` and `post_logout_redirect_uri` are `window.location.origin + BASE_URL + "auth/callback"`, and `safeReturnPath` strips the base from the `url_state` path before its app-local check ([[auth-keycloak-gaiadata]]).
- **Every api base helper normalizes a trailing slash**: `API_URL` in the admin (`admin/src/api-url.ts`), `appUrl` in the api (`api/src/app-url.ts`, behind `ADMIN_URL` / `FRONTEND_URL`), and `baseApiUrl` / `baseBrowserApiUrl` in the frontend (`frontend/src/api.ts`). Without it a relative `new URL()` silently drops the path prefix.
- **Links are built relative to those bases**, `new URL("samples/x", adminUrl)`, never with a leading slash: `new URL("/samples/x", "https://host/admin/")` resolves to `https://host/samples/x`. Every mail link follows this rule ([[mail-notifications]]).
- The frontend keeps two api bases: `baseApiUrl` reads `API_URL` under SSR so the server reaches the api over the compose network, and `baseBrowserApiUrl` reads `VITE_API_URL` alone, so a server-rendered link (attachments) stays followable from the browser.
- Config now carries one origin: `CORS_ORIGINS` lists only it, `ADMIN_URL` ends in `/admin`, `VITE_API_URL` ends in `/api`, the mock realm registers `http://localhost:3000/admin/*` as redirect URI with `http://localhost:3000` as web origin, and the e2e page objects read `ADMIN_URL=http://localhost:4000/admin`.
- **Preprod login stays broken until the GaiaData `formaterre-igsn` client is re-registered** with `https://igsn.<prod-domain>/admin/auth/callback` and web origin `https://igsn.<prod-domain>`, a human prerequisite of the next deploy recorded in `docs/gaiadata-client-provisioning.md`. Dev against the real GaiaData SSO needs the `localhost:3000/admin` pair registered too; only the old `localhost:3001` pair exists there today.
