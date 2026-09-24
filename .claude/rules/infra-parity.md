# Compose parity

- A change to a service's runtime requirements (env var, volume, port, healthcheck, new service) lands in the same change in `docker-compose.dev.yml`, `infra/preprod/docker-compose.yml`, `infra/prod/docker-compose.yml`, and the e2e stack when it runs that service.
- Before finishing such a change, diff the preprod and prod composes against it: a requirement that only reaches dev ships a broken deploy.
- Declare secrets and host-specific values as `${VAR}` and add them to `infra/scripts/compose-env.ts`, the single list; the pre-commit hook regenerates both `docker-compose.env.example`.
- Never edit an example env file by hand.
- A new variable is a `production` environment variable under its plain name, or an environment secret when it is sensitive, never a repository-level one nor a prefixed name.
- A runtime variable needs no workflow edit, the whole `vars` and `secrets` contexts reaching the script.
- One baked into a bundle is also declared as a build job output and handed from the build job to the deploy job in `.github/workflows/release.yml`, so the api gets the value the bundle was built with.
- One consumed by the deploy itself is also named in the deploy step of `.github/workflows/release.yml`.
- Set plain constants (paths, ports) directly in the compose file.
