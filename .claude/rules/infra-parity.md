# Compose parity

- A change to a service's runtime requirements (env var, volume, port, healthcheck, new service) lands in the same change in `docker-compose.dev.yml`, `infra/stack/docker-compose.yml`, and the e2e stack when it runs that service.
- Before finishing such a change, diff `infra/stack/docker-compose.yml` against it: a requirement that only reaches dev ships a broken deploy.
- Declare secrets and host-specific values as `${VAR}` and add them to `infra/scripts/compose-env.ts`, the single list; the pre-commit hook regenerates `docs/deploy-variables.md`.
- Never edit `docs/deploy-variables.md` by hand.
- A new variable is set on GitLab per environment scope (`preproduction`, `production`), a secret Masked.
- A runtime variable needs no pipeline edit, `payload` in the deploy sending every non-deploy-only variable.
- One baked into a bundle is also a `--build-arg` in the `build` job of `.gitlab-ci.yml`.
- Set plain constants (paths, ports) directly in the compose file.
