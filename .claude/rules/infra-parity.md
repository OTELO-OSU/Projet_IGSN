# Preprod compose parity

`infra/preprod/docker-compose.yml` is the deployed stack. It MUST NOT drift
from what the apps need to run.

A change that adds, renames, or removes a runtime requirement of a service
(environment variable, volume, port, healthcheck, new service) lands in the
same change in every compose file that runs it:

- `docker-compose.dev.yml` (dev stack)
- `infra/preprod/docker-compose.yml` (preprod stack)
- the e2e stack, when it runs the service

A requirement that only reaches dev ships a broken deploy. Before finishing
any change that touches a service's env vars, volumes, or ports, diff the
preprod compose against it.

Secrets and host-specific values stay out of the compose file: declare them as
`${VAR}` and document them in `infra/preprod/docker-compose.env.example`.
Plain constants (paths, ports) are set directly in the compose.
