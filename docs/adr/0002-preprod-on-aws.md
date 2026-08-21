# 0002. Preproduction on a single AWS EC2 host (docker-compose + Caddy)

Date: 2026-07-01

## Status

Accepted

## Context

CI only lints and tests, so no deployment path exists. Preprod needs the three apps plus a database, cheap to run and simple to operate, with a clean path to containers or Kubernetes later. A manual, repeatable deploy is enough; CD is not required yet.

## Decision

- **Containerize all three apps**, the image being the portable unit that runs here now and on ECS/EKS later.
- **One EC2 host** (Amazon Linux 2023, `t3.small`) runs the stack via [docker-compose](../../infra/preprod/docker-compose.yml), in the default VPC: with no RDS to isolate, a custom VPC would be dead weight.
- **Postgres as a container** with a persistent `pgdata` volume, never exposed off the host.
- **[Caddy](../../infra/preprod/Caddyfile) at the edge** terminates TLS (auto HTTPS via Let's Encrypt), proxies `{$DOMAIN}`, `admin.$DOMAIN` and `api.$DOMAIN`, and sets the headers from [security-infra.md](../../.claude/rules/security-infra.md). Only Caddy publishes ports.
- **No registry**: images are built for `linux/amd64` on the laptop and shipped over SSH with `docker save | gzip | ssh 'docker load'`.
- **Manual deploy** with `make preprod-deploy`, which authorizes the operator's current IP for the run and revokes it on exit, so `:22` stays closed and no CI/CD role is needed.
- **Migrations** run as a one-off compose `migrate` service that must complete before the api starts.
- **OpenTofu** holds the IaC in `infra/`, env values in `env/<env>.tfvars`, state in S3 with S3-native locking.

## Consequences

- The api is internet-facing, since the admin browser calls it cross-origin, and restricts callers with CORS; Postgres is reachable only over the compose network.
- Single host, single AZ, so no HA: an outage takes preprod down until redeploy, and `pgdata` survives container restarts but not host loss.
- No auto-deploy on `main`; add CD later if the cadence warrants it.
- The k8s path reuses the Dockerfiles and images: only docker-compose and the EC2 OpenTofu become manifests plus a managed database.
