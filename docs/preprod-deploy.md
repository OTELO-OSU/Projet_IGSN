# Preprod deployment

Deploying to already stood-up infra. See also:

- [preprod-architecture.md](preprod-architecture.md): the architecture overview.
- [preprod-setup.md](preprod-setup.md): first-time infra setup and infra changes.

## One-time per dev

Both steps below are done once per dev, not on every deploy.

### Required laptop permissions

AWS identity: `ec2-instance-connect:SendSSHPublicKey`,
`ec2:AuthorizeSecurityGroupIngress`, `ec2:RevokeSecurityGroupIngress`, and read
access to the tofu state. Local tools: `docker`, the AWS CLI (`aws`),
`ssh`/`scp`, and an SSH
key at `~/.ssh/id_ed25519.pub` (or set `SSH_PUBLIC_KEY`).

### Pull the tofu config

The infra is already stood up, so you do NOT run apply. Pull the shared tofu
config once. State lives in S3, so init pulls everything you need:

```
aws login              # or otherwise configure AWS credentials
make preprod-tofu-init
```

Only run `make preprod-tofu-apply` when you are deliberately changing infra (see
[preprod-setup.md](preprod-setup.md)).

### Install your SSH key

Bootstraps via EC2 Instance Connect, then adds your key to `authorized_keys`:

```
make preprod-ssh-send-key                                      # ~/.ssh/id_ed25519.pub
make preprod-ssh-send-key SSH_PUBLIC_KEY_PATH=~/.ssh/other.pub  # a different key
```

## Deploy

Once the two steps above are done, deploy from the repo root with AWS
credentials configured:

```
make preprod-deploy DOMAIN=<domain>
```

The script builds the three images, opens SSH to your current public IP, ships
the images + [docker-compose.yml](../infra/preprod/docker-compose.yml) + Caddyfile

- the `keycloak/` and `saml-idp/` import dirs, runs migrations, then starts the
  stack (env from the host `docker-compose.env`). SSH ingress is revoked on exit.

### Manual SSH access

`make preprod-ssh` opens access, connects, and revokes on exit.
[ssh-access.sh](../infra/preprod/scripts/ssh-access.sh) exposes the pieces:

```
make preprod-ssh                             # open, ssh in, revoke on disconnect
```

All assume your key is installed (`make preprod-ssh-send-key`) and share
[common.sh](../infra/preprod/scripts/common.sh) (infra outputs +
`ssh_open`/`ssh_close`).

### Runtime secrets

The Postgres password lives in the host `docker-compose.env`, which you
manage and copy yourself. To add another app secret, add it there and reference
it in [docker-compose.yml](../infra/preprod/docker-compose.yml).
