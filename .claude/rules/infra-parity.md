# Preprod compose parity

- A change to a service's runtime requirements (env var, volume, port, healthcheck, new service) lands in the same change in `docker-compose.dev.yml`, `infra/preprod/docker-compose.yml`, and the e2e stack when it runs that service.
- Before finishing such a change, diff the preprod compose against it: a requirement that only reaches dev ships a broken deploy.
- Declare secrets and host-specific values as `${VAR}` and document them in `infra/preprod/docker-compose.env.example`.
- Set plain constants (paths, ports) directly in the compose file.
