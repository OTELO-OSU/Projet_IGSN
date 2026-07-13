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
  the Cloudflare proxy.
- **Images** are built on your laptop and shipped over SSH
  (`docker save | gzip | ssh 'docker load'`). No registry.
