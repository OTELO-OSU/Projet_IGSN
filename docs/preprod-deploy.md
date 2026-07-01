# Preprod deployment

Three apps plus Postgres as Docker containers on one EC2 host, behind a Caddy
reverse proxy that terminates TLS. No CD: deploy manually with `make
preprod-deploy` ([deploy.sh](../infra/preprod/scripts/deploy.sh)). Everything
preprod (OpenTofu, scripts, compose stack) lives under
[infra/preprod/](../infra/preprod); prod will be a sibling `infra/prod/`.

## Architecture

- **EC2** host (Amazon Linux 2023, IMDSv2-only, encrypted root volume). cloud-init
  installs Docker + compose. Only 80/443 are public; SSH is opened per-deploy and
  revoked.
- **Postgres** container with a persistent volume (`pgdata`), never exposed off
  the host. Credentials live in the host `docker-compose.env`.
- **Cloudflare** proxies the three hostnames (orange cloud, SSL mode Full
  (strict)) and terminates TLS at its edge, re-originating HTTPS to the host.
- **Caddy** ([Caddyfile](../infra/preprod/Caddyfile)) serves a Cloudflare Origin
  CA cert (mounted from the host `~/certs`) and proxies `igsn.$DOMAIN` ->
  frontend, `igsn-admin.$DOMAIN` -> admin, `igsn-api.$DOMAIN` -> api, setting
  security headers at the edge. All three are flat single-level subdomains, not
  nested (`admin.igsn.$DOMAIN`): Cloudflare's `*.$DOMAIN` cert covers only one
  label deep, so nested hosts fail the handshake. It does not use Let's Encrypt:
  ACME can't validate behind the Cloudflare proxy.
- **Images** are built on your laptop and shipped over SSH
  (`docker save | gzip | ssh 'docker load'`). No registry.

## One-time setup

1. Init tofu (partial S3 backend, S3-native locking; see
   [infra/preprod/tf/backend.hcl](../infra/preprod/tf/backend.hcl)). The state
   bucket must exist first.

   ```
   make preprod-tofu-init
   make preprod-tofu-apply
   ```

   State lives in S3, so another dev with AWS access just re-runs
   `make preprod-tofu-init` to pull the shared config; no apply unless changing
   infra.

2. Point Cloudflare at the EIP. Create proxied (orange cloud) A records for
   `igsn.$DOMAIN`, `igsn-admin.$DOMAIN`, and `igsn-api.$DOMAIN` (single-level
   subdomains, so the `*.$DOMAIN` cert covers them), and set SSL/TLS mode to
   **Full (strict)** so Cloudflare requires a trusted cert on the origin:

   ```
   tofu -chdir=infra/preprod/tf output -raw public_ip
   ```

3. Create a Cloudflare Origin CA certificate (Cloudflare dashboard: SSL/TLS ->
   Origin Server -> Create Certificate), covering `$DOMAIN` and `*.$DOMAIN`.
   Save the two PEM blocks to `infra/preprod/certs/` (gitignored):

   ```
   mkdir -p infra/preprod/certs
   # paste the certificate  -> infra/preprod/certs/origin.pem
   # paste the private key   -> infra/preprod/certs/origin.key
   ```

4. Create the host env file. Copy the example, set a strong `DATABASE_PASSWORD`:

   ```
   cp infra/preprod/docker-compose.env.example infra/preprod/docker-compose.env
   # edit it
   ```

5. Install your SSH key on the host once. Bootstraps via EC2 Instance Connect,
   then adds your key to `authorized_keys`:

   ```
   make preprod-ssh-send-key                                      # ~/.ssh/id_ed25519.pub
   make preprod-ssh-send-key SSH_PUBLIC_KEY_PATH=~/.ssh/other.pub  # a different key
   ```

6. Copy the env file and the origin cert to the host:

   ```
   infra/preprod/scripts/ssh-access.sh grant
   scp infra/preprod/docker-compose.env ec2-user@<eip>:~/
   scp -r infra/preprod/certs ec2-user@<eip>:~/
   infra/preprod/scripts/ssh-access.sh revoke
   ```

## Deploy

From the repo root, with AWS credentials configured:

```
make preprod-deploy DOMAIN=igsn.example.org
```

The script builds the three images, opens SSH to your current public IP, ships
the images + [docker-compose.yml](../infra/preprod/docker-compose.yml) +
Caddyfile, runs migrations, then starts the stack (reading env from the host
`docker-compose.env`). SSH ingress is revoked on exit.

### Manual SSH access

`make preprod-ssh` opens access, connects, and revokes on exit.
[ssh-access.sh](../infra/preprod/scripts/ssh-access.sh) exposes the pieces:

```
make preprod-ssh                             # open, ssh in, revoke on disconnect
infra/preprod/scripts/ssh-access.sh grant    # open :22, then: ssh ec2-user@<eip>
infra/preprod/scripts/ssh-access.sh revoke   # close :22 again
```

All assume your key is installed (`make preprod-ssh-send-key`) and share
[common.sh](../infra/preprod/scripts/common.sh) (infra outputs +
`ssh_open`/`ssh_close`).

### Required laptop permissions

AWS identity: `ec2-instance-connect:SendSSHPublicKey`,
`ec2:AuthorizeSecurityGroupIngress`, `ec2:RevokeSecurityGroupIngress`, and read
access to the tofu state. Local tools: `docker`, `aws`, `ssh`/`scp`, and an SSH
key at `~/.ssh/id_ed25519.pub` (or set `SSH_PUBLIC_KEY`).

### Runtime secrets

The Postgres password lives in the host `docker-compose.env`, which you
manage and copy yourself. To add another app secret, add it there and reference
it in [docker-compose.yml](../infra/preprod/docker-compose.yml).
