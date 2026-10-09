---
type: infrastructure
title: Preprod and prod on Portainer from GitHub Actions
description: >-
  One infra/stack/ deployed twice on a shared Portainer, GitHub Actions pushing
  the images to GHCR and updating each stack through the Portainer API over the
  infra team's VPN, Caddy on plain HTTP behind the infra team's TLS proxy.
resource: infra/stack/docker-compose.yml
tags:
  - infra
  - preprod
  - prod
  - deploy
relations:
  - type: depends_on
    target: infra-parity-rule
status: stable
---

One stack definition, `infra/stack/`, runs as two Portainer stacks on one shared host, one per GitHub environment (`preproduction`, `production`); see ADR 0002 and `docs/deploy.md`.

- **GitHub Actions** (`.github/workflows/deploy.yml`) builds the api, admin, frontend and caddy images, pushes them to GHCR as public packages, then `infra/scripts/deploy-portainer.sh` joins the infra team's Fortinet VPN with openfortivpn and PUTs the compose file and env to the stack through the Portainer CE API.
- **Triggers:** a push to `main` or a manual run of the Deploy workflow on any branch deploys preproduction; the highest stable `vX.Y.Z` tag pushed deploys production, never a manual run.
- **GitHub environment variables and secrets** are the single source of the env, listed in the generated `docs/deploy-variables.md` from `infra/scripts/compose-env.ts`; Portainer env edits are overwritten by the next deploy.
- **Postgres as a container** (`paradedb/paradedb:0.25.11-pg17`) with a persistent `paradedb-data` volume, never exposed off the host; nothing backs it up yet.
- **Caddy** serves plain HTTP on `HTTP_PORT` behind the infra team's TLS proxy, path-routing `/api` (prefix stripped), `/admin` and the rest to the frontend, plus security headers ([[single-origin-routing]]); its Caddyfile is baked into an image since an API-created stack cannot bind-mount repo files.
- Caddy trusts private-range peers only, with `trusted_proxies_strict`, so `HTTP_PORT` must be reachable from the infra proxy alone ([[rate-limiting]]).
- **Auth authenticates against GaiaData**, the test SSO for preprod; the throwaway Keycloak and mock SAML IdP stay in dev and e2e only, a deliberate divergence from [[infra-parity-rule]] ([[auth-keycloak-gaiadata]]).
- **Outbound mail** goes through a transactional-mail provider's SMTP endpoint on 587 with STARTTLS.
- The first super admin is a manual SQL write recorded in `docs/deploy.md`.
