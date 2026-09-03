---
type: infrastructure
title: Preprod on a single AWS EC2 host
description: >-
  Three app containers plus Postgres on one EC2 host behind Caddy and
  Cloudflare on a single origin, deployed manually with images shipped over
  SSH.
resource: infra/preprod/docker-compose.yml
tags:
  - infra
  - preprod
  - deploy
relations:
  - type: depends_on
    target: infra-parity-rule
status: stable
---

Everything preprod (OpenTofu, scripts, compose stack) lives under `infra/preprod/`; prod will be a sibling `infra/prod/`. No CD: deploy manually with `make preprod-deploy` (`infra/preprod/scripts/deploy.sh`).

- **All three apps are containerized**, the image being the portable unit that also runs on ECS or EKS later.
- **One EC2 host** (Amazon Linux 2023, `t3.small`, IMDSv2-only, encrypted root volume) in the default VPC, with no RDS to isolate. cloud-init installs Docker and compose. Only 80/443 are public and SSH is opened per-deploy then revoked.
- **Postgres as a container** with a persistent `pgdata` volume, never exposed off the host; credentials live in the host `docker-compose.env`.
- **Cloudflare** proxies the one hostname `igsn.$DOMAIN` (orange cloud, SSL mode Full (strict)) and terminates TLS at its edge, re-originating HTTPS.
- **Caddy** serves a Cloudflare Origin CA cert (mounted from `~/certs`) behind one host, `igsn.$DOMAIN`, path-routing `/api` to api (prefix stripped), `/admin` to admin and everything else to frontend, plus security headers ([[single-origin-routing]]). The host is a flat single-level subdomain, the `*.$DOMAIN` cert covering one label only. No Let's Encrypt, ACME being unable to validate behind the Cloudflare proxy. Caddy trusts every peer for the visitor's real IP, sound only because `ec2.tf` restricts 80/443 to Cloudflare's fetched ranges ([[rate-limiting]]).
- **Auth authenticates against the GaiaData test SSO**, the only identity provider preprod deploys; the throwaway Keycloak and mock SAML IdP are gone here and kept in dev and e2e, a deliberate divergence from [[infra-parity-rule]] since that requirement exists only outside preprod ([[auth-keycloak-gaiadata]]).
- **Outbound mail** goes through a transactional-mail provider's SMTP endpoint on 587 with STARTTLS, not AWS SES, the org blocking the IAM user SES auth requires; the sending domain is verified in the provider's dashboard with DKIM/SPF in Cloudflare.
- **Images are built on a laptop and shipped over SSH** (`docker save | gzip | ssh 'docker load'`). No registry.
- Secrets and host-specific values are `${VAR}` documented in `infra/preprod/docker-compose.env.example`; the first super admin is a manual SQL write recorded in `docs/preprod-deploy.md`.
