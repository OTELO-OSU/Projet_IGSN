# 0002. Preprod and prod on Portainer, deployed from GitLab CI

Date: 2026-10-07

## Status

Accepted

## Context

- AWS and OpenTofu are no longer needed.
- The hosting is a shared Portainer run by the infra team.
- Releases go through the institution's GitLab.
- GitHub stays the development home.

## Decision

- **Containers are the unit**, as before.
- **One [`infra/stack/`](../../infra/stack/docker-compose.yml)** defines both environments, each a Portainer stack.
- **GitLab CI builds and pushes** the images to the GitLab registry, then calls the Portainer CE API with the compose content and env.
- Rejected: Portainer Git stacks, whose webhook and relative-path volumes are Business Edition only and whose env lives in the Portainer UI.
- **GitLab environment-scoped variables** are the single source of the env.
- **Caddy stays the in-stack router and header setter**, serving plain HTTP behind the infra proxy.
- Its Caddyfile is baked into an image, since an API-created stack cannot bind-mount repo files.
- **Triggers:** `main` and the `preprod` branch deploy preproduction, the highest stable `vX.Y.Z` tag deploys production.
- **Migrations** run as a one-off compose `migrate` service that must complete before the api starts.
- See [deploy.md](../deploy.md).

## Consequences

- One shared host, so prod and preprod share its fate.
- No HA and no backup yet.
- The edge (`HTTP_PORT`, `trusted_proxies`) is a knob to settle with the infra team.
- Env edits made in Portainer are overwritten by the next deploy.
- A migration blocks a rollback.
