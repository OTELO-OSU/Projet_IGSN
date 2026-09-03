---
type: practice
title: "Compose parity across dev, e2e and preprod"
description: >-
  A change to a service's runtime requirements lands in the dev, preprod and e2e
  compose files in the same change.
resource: .claude/rules/infra-parity.md
tags:
  - infra
  - practice
relations: []
status: stable
---

- A change to a service's runtime requirements (env var, volume, port, healthcheck, new service) lands in the same change in `docker-compose.dev.yml`, `infra/preprod/docker-compose.yml`, and the e2e stack when it runs that service.
- Before finishing such a change, diff the preprod compose against it: a requirement that only reaches dev ships a broken deploy.
- Declare secrets and host-specific values as `${VAR}` and document them in `infra/preprod/docker-compose.env.example`.
- Set plain constants (paths, ports) directly in the compose file.
- The edge is part of parity: dev and e2e run a `caddy` service on `infra/Caddyfile`, preprod its own `infra/preprod/Caddyfile`, both routing the same `/admin` and `/api` paths ([[single-origin-routing]]).
- The one accepted divergence is preprod's auth stack, which drops the throwaway Keycloak and mock IdPs dev and e2e need ([[preprod-infrastructure]]).
