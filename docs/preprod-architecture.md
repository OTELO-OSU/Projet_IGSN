# Preprod architecture

Three apps plus Postgres as Docker containers on one EC2 host, behind a Caddy
reverse proxy. No CD: deploy manually with `make preprod-deploy`
([deploy.sh](../infra/preprod/scripts/deploy.sh)). Everything preprod (OpenTofu,
scripts, compose stack) lives under [infra/preprod/](../infra/preprod); prod will
be a sibling `infra/prod/`.

- **EC2** host (Amazon Linux 2023, IMDSv2-only, encrypted root volume). cloud-init
  installs Docker + compose. Only 80/443 are public; SSH is opened per-deploy and
  revoked.
- **Postgres** container with a persistent volume (`pgdata`), never exposed off
  the host. Credentials live in the host `docker-compose.env`.
- **Cloudflare** proxies the hostnames (orange cloud, SSL mode Full (strict)) and
  terminates TLS at its edge, re-originating HTTPS to the host.
- **Auth** authenticates against the GaiaData test SSO, the only identity
  provider preprod deploys. The throwaway Keycloak and mock SAML IdP that once
  stood beside it as the rollback path are gone; dev and e2e keep theirs, a
  deliberate divergence from
  [infra-parity](../.claude/rules/infra-parity.md) since the requirement
  exists only outside preprod.
- **Caddy** ([Caddyfile](../infra/preprod/Caddyfile)) serves a Cloudflare Origin
  CA cert (mounted from `~/certs`) and proxies each host: `igsn.$DOMAIN` ->
  frontend, `igsn-admin.$DOMAIN` -> admin, `igsn-api.$DOMAIN` -> api, plus
  security headers. Hosts are flat single-level subdomains, not nested: the `*.$DOMAIN`
  cert covers only one label deep. No Let's Encrypt: ACME can't validate behind
  the Cloudflare proxy. Caddy trusts every peer for the visitor's real IP
  (`trusted_proxies static 0.0.0.0/0`); this is only sound because `ec2.tf`
  restricts 80/443 to Cloudflare's fetched ranges, so no other peer can reach
  it.
- **Rate limiting** runs in the api as two fixed tiers: the visitor IP for
  public reads (50/60s), the authenticated user's JWT `sub` for admin routes
  (100/60s). It depends on Caddy forwarding the real client IP:
  `TRUST_PROXY_HEADERS=true` on the api (`docker-compose.yml`) is required,
  not optional, or every visitor is billed to Caddy's own container address.
  The whole thing can be disabled with `RATE_LIMIT_ENABLED=false` (see
  [docker-compose.env.example](../infra/preprod/docker-compose.env.example)).
  An empty value counts as unset; a malformed one fails the api at boot,
  naming the variable. See [ADR 0029](adr/0029-api-rate-limiting.md).
- **Outbound mail** goes through a transactional-mail provider's SMTP
  endpoint, not AWS (the org blocks creating the IAM user/role SES auth
  requires). The api talks STARTTLS on 587 with the `SMTP_*` values from the
  host env file; the sending domain is verified in the provider's dashboard
  (DKIM/SPF records in Cloudflare). See [preprod-setup.md](preprod-setup.md).
- **Images** are built on your laptop and shipped over SSH
  (`docker save | gzip | ssh 'docker load'`). No registry.
