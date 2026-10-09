---
type: practice
title: "Compose parity across dev, e2e and the deploy stack"
description: >-
  A change to a service's runtime requirements lands in the dev, deploy and e2e
  compose files in the same change.
resource: .claude/rules/infra-parity.md
tags:
  - infra
  - practice
relations: []
status: stable
---

- A change to a service's runtime requirements (env var, volume, port, healthcheck, new service) lands in the same change in `docker-compose.dev.yml`, `infra/stack/docker-compose.yml`, and the e2e stack when it runs that service.
- Before finishing such a change, diff the deploy compose against it: a requirement that only reaches dev ships a broken deploy.
- Declare secrets and host-specific values as `${VAR}` and add them to `infra/scripts/compose-env.ts`, whose `table` the pre-commit hook writes to `docs/deploy-variables.md`.
- A new variable is set in each GitHub environment, a secret as an environment secret; one baked into a bundle is also a `--build-arg` in the build step of `.github/workflows/deploy.yml`.
- Set plain constants (paths, ports) directly in the compose file.
- The edge is part of parity: dev and e2e run a `caddy` service on `infra/Caddyfile`, the deploy its own `infra/stack/Caddyfile`, both routing the same `/admin` and `/api` paths ([[single-origin-routing]]).
- The one accepted divergence is the deployed auth stack, which drops the throwaway Keycloak and mock IdPs dev and e2e need ([[preprod-infrastructure]]).
