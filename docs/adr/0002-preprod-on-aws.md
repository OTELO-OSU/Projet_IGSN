# 2. Preproduction on a single AWS EC2 host (docker-compose + Caddy)

Date: 2026-07-01

## Status

Accepted

## Context

No deployment path existed: CI only lints and tests. We need a preprod for all
three apps (`api`, `admin`, `frontend`) plus a database: cheap, simple to
operate, with a clean path to containers/Kubernetes later. A manual, repeatable
deploy is enough; CD is not required yet.

## Decision

- **Containerize all three apps.** The image is the portable unit; the same
  images run here now and on ECS/EKS later.
- **Compute: one EC2 host** (Amazon Linux 2023, `t3.small`) running the stack via
  docker-compose ([docker-compose.yml](../../infra/preprod/docker-compose.yml)),
  fronted by Caddy. It lives in the default VPC: with no RDS to isolate, a custom
  VPC would be dead weight.
- **Database: Postgres as a container** with a persistent volume (`pgdata`),
  never exposed off the host. Its password lives in the host
  `docker-compose.prod.env`, managed and copied by the operator.
- **Edge: Caddy** ([Caddyfile](../../infra/preprod/Caddyfile)) terminates TLS (auto
  HTTPS via Let's Encrypt), proxies `{$DOMAIN}` -> frontend, `admin.$DOMAIN` ->
  admin, `api.$DOMAIN` -> api, and sets the security headers from
  [security-infra.md](../../.claude/rules/security-infra.md). Only Caddy
  publishes ports (80/443).
- **No registry.** Images are built on the laptop for `linux/amd64` and shipped
  over SSH with `docker save | gzip | ssh 'docker load'`.
- **Deploy: manual, from the laptop** with `make preprod-deploy`
  ([deploy.sh](../../infra/preprod/scripts/deploy.sh)). SSH (`:22`) is
  closed by default: the script authorizes the operator's current IP for the
  deploy and revokes it on exit. No CI/CD auth (no OIDC role).
- **Migrations** run as a one-off compose `migrate` service (the api image with
  `node src/migrate.ts`) that must complete before the api starts.
- **IaC: OpenTofu** in `infra/`, env values in `env/<env>.tfvars`, state in an S3
  backend with S3-native locking (`use_lockfile`, no DynamoDB).

## Consequences

- All three apps are internet-facing behind Caddy, so the api is public (the
  admin browser calls it cross-origin); it restricts callers with CORS. Postgres
  is reachable only over the compose network.
- Single host, single AZ: no HA. Acceptable for preprod; a host or AZ outage
  takes it down until redeploy. `pgdata` survives container restarts but not host
  loss.
- No auto-deploy on `main`; a human runs `make preprod-deploy`. Add CD later if the
  cadence warrants it.
- The k8s path reuses the Dockerfiles and images; only docker-compose and the EC2
  OpenTofu become k8s manifests + a managed database.
