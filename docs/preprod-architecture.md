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
- **Auth** is the dev throwaway Keycloak plus the mock SAML IdP (see
  [ADR 0004](adr/0004-preprod-auth-stack.md)), at `igsn-auth.$DOMAIN` (Keycloak)
  and `igsn-idp.$DOMAIN` (IdP). `KEYCLOAK_PASSWORD` in the host env file is the
  Keycloak admin password and the shared SAML-user password.
- **Caddy** ([Caddyfile](../infra/preprod/Caddyfile)) serves a Cloudflare Origin
  CA cert (mounted from `~/certs`) and proxies each host: `igsn.$DOMAIN` ->
  frontend, `igsn-admin.$DOMAIN` -> admin, `igsn-api.$DOMAIN` -> api,
  `igsn-auth.$DOMAIN` -> Keycloak, `igsn-idp.$DOMAIN` -> SAML IdP, plus security
  headers. Hosts are flat single-level subdomains, not nested: the `*.$DOMAIN`
  cert covers only one label deep. No Let's Encrypt: ACME can't validate behind
  the Cloudflare proxy. Caddy trusts every peer for the visitor's real IP
  (`trusted_proxies static 0.0.0.0/0`); this is only sound because `ec2.tf`
  restricts 80/443 to Cloudflare's fetched ranges, so no other peer can reach
  it.
- **Rate limiting** runs in the api, keyed on the visitor IP for public reads
  and on the authenticated user for admin routes. It depends on Caddy
  forwarding the real client IP: `TRUST_PROXY_HEADERS=true` on the api
  (`docker-compose.yml`) is required, not optional, or every visitor is billed
  to Caddy's own container address. Per-route budgets are tunable with
  `RATE_LIMIT_<KEY>_POINTS` / `RATE_LIMIT_<KEY>_DURATION`, or the whole thing
  can be disabled with `RATE_LIMIT_ENABLED=false` (see
  [docker-compose.env.example](../infra/preprod/docker-compose.env.example)).
  An empty value counts as unset; a malformed one fails the api at boot,
  naming the variable. See [ADR 0020](adr/0020-api-rate-limiting.md).
- **Images** are built on your laptop and shipped over SSH
  (`docker save | gzip | ssh 'docker load'`). No registry.
