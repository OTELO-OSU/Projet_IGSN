# 0002. Preprod and prod on Portainer, deployed from GitHub Actions

Date: 2026-10-07

## Status

Accepted

## Context

- AWS and OpenTofu are no longer needed.
- The hosting is a shared Portainer run by the infra team.
- GitHub stays the development home.
- The infra team runs neither GitLab CI nor its registry.
- Portainer sits behind their Fortinet VPN.

## Decision

- **Containers are the unit**, as before.
- **One [`infra/stack/`](../../infra/stack/docker-compose.yml)** defines both environments, each a Portainer stack.
- **GitHub Actions builds and pushes** the images to GHCR as public packages, joins the VPN with openfortivpn, then calls the Portainer CE API with the compose content and env.
- Rejected: GitLab CI and its registry, unused by the infra team.
- Rejected: the infra team's registry watchdog pulling new tags, since it would not re-run the one-off `migrate` nor report a failed deploy back to CI.
- Rejected: Portainer Git stacks, whose webhook and relative-path volumes are Business Edition only and whose env lives in the Portainer UI.
- **GitHub environment variables and secrets** are the single source of the env.
- **Caddy stays the in-stack router and header setter**, serving plain HTTP behind the infra proxy.
- Its Caddyfile is baked into an image, since an API-created stack cannot bind-mount repo files.
- **Triggers:** `main` and a manual run on any branch deploy preproduction, the highest stable `vX.Y.Z` tag pushed deploys production, never a manual run.
- **Migrations** run as a one-off compose `migrate` service that must complete before the api starts.
- See [deploy.md](../deploy.md).

## Consequences

- One shared host, so prod and preprod share its fate.
- No HA and no backup yet.
- The edge (`HTTP_PORT`, `trusted_proxies`) is a knob to settle with the infra team.
- Env edits made in Portainer are overwritten by the next deploy.
- A migration blocks a rollback.
- The deploy depends on a VPN account without OTP.
