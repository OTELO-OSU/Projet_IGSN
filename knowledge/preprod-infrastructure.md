---
type: infrastructure
title: Preprod and prod on Portainer from GitLab CI
description: >-
  One infra/stack/ deployed twice on a shared Portainer, GitLab CI building the
  images and updating each stack through the Portainer API, Caddy on plain HTTP
  behind the infra team's TLS proxy.
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

One stack definition, `infra/stack/`, runs as two Portainer stacks on one shared host, one per GitLab environment (`preproduction`, `production`); see ADR 0002 and `docs/deploy.md`.

- **GitLab CI** (`.gitlab-ci.yml`) on the `gitlab.osupytheas.fr` mirror builds the api, admin, frontend and caddy images, pushes them to the GitLab registry, then `infra/scripts/deploy-portainer.sh` PUTs the compose file and env to the stack through the Portainer CE API.
- **Triggers:** a push to `main` or the `preprod` branch deploys preproduction, the GitHub "Deploy preprod" dispatch force-pushing any branch to `preprod`; the highest stable `vX.Y.Z` tag deploys production.
- **GitLab environment-scoped variables** are the single source of the env, listed in the generated `docs/deploy-variables.md` from `infra/scripts/compose-env.ts`; Portainer env edits are overwritten by the next deploy.
- **Postgres as a container** (`paradedb/paradedb:0.25.11-pg17`) with a persistent `paradedb-data` volume, never exposed off the host; nothing backs it up yet.
- **Caddy** serves plain HTTP on `HTTP_PORT` behind the infra team's TLS proxy, path-routing `/api` (prefix stripped), `/admin` and the rest to the frontend, plus security headers ([[single-origin-routing]]); its Caddyfile is baked into an image since an API-created stack cannot bind-mount repo files.
- Caddy trusts private-range peers only, with `trusted_proxies_strict`, so `HTTP_PORT` must be reachable from the infra proxy alone ([[rate-limiting]]).
- **Auth authenticates against GaiaData**, the test SSO for preprod; the throwaway Keycloak and mock SAML IdP stay in dev and e2e only, a deliberate divergence from [[infra-parity-rule]] ([[auth-keycloak-gaiadata]]).
- **Outbound mail** goes through a transactional-mail provider's SMTP endpoint on 587 with STARTTLS.
- The first super admin is a manual SQL write recorded in `docs/deploy.md`.
