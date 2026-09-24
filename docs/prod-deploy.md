# Prod deploy

- Publishing a GitHub release builds the three images, pushes them to GHCR under the release tag, and deploys them over SSH with docker compose ([release.yml](../.github/workflows/release.yml)).
- The stack lives in [infra/prod/](../infra/prod) and mirrors [preprod](preprod-architecture.md), minus Postgres: the prod database is external and managed.
- A prerelease only publishes the images.
- A release that is not the repository's latest one only publishes the images, so a slow run of an older release never overwrites a newer one.
- A release whose production environment is incomplete only publishes the images, the run staying green with a warning naming the missing variables.
- Deploys run one at a time.

## What the infra team provides

- A host reachable over SSH from the GitHub runners, on the port set in `SSH_PORT`, with Docker, the compose plugin, and the deploy user in the `docker` group.
- Ports 80 and 443 open to the internet, with `igsn.$DOMAIN` resolving to the host.
- Caddy faces clients directly, so the rate limits key on the peer address; a proxy added in front needs `trusted_proxies` in the [Caddyfile](../infra/prod/Caddyfile).
- A certificate for `igsn.$DOMAIN`, full chain, and its key at `~/igsn/certs/origin.pem` and `~/igsn/certs/origin.key`; the deploy refuses to run without them and never ships them.
- Renewing that certificate is the infra team's job: replace both files, then run `docker compose -p igsn exec caddy caddy reload --config /etc/caddy/Caddyfile --force` from `~/igsn`.
- A Postgres 17 database with PostGIS, its `postgis`, `ltree`, `unaccent` and `pg_trgm` extensions already created, and an application user owning the schema.
- The migrations run `CREATE EXTENSION IF NOT EXISTS`, which a plain owner may not do, hence the extensions created beforehand.
- TLS on the database with a certificate the api can verify, since `DATABASE_SSL` defaults to `verify-full`.
- When that certificate is signed by a private CA, its bundle under `~/igsn/ca/` and `DATABASE_CA_FILE` set to `/ca/<file>`.
- `DATABASE_SSL=require` encrypts without checking the certificate, for a database whose certificate cannot be verified.
- Attachments stay on the host in the `attachments` volume, so the host is not stateless.

## GitHub setup

- `make env-list` prints every variable and secret, its GitHub name and its purpose.
- Every one lives in the `production` environment under that plain name, never at the repository level.
- `variable` in its `Source` column is an environment variable.
- Keep anything non-sensitive a variable: secret masking replaces the value everywhere in the logs, so a secret `igsn` turns every `igsn` into `***`, image names included.
- `secret` is a secret of the `production` environment.
- `release tag` is set by the run itself.
- The build job reads the environment with `deployment: false`, so it bakes the environment's values without recording a deployment.
- The deploy hands the api the values the build baked into the bundles, so the two never disagree, even on a re-run of the deploy job alone.
- Changing a baked value takes a re-run of the whole workflow, which pushes the tag again, the deploy always pulling it.
- The `production` environment must allow the release tags: set its deployment branches to "Selected branches and tags" with a `v*` tag rule.
- A required reviewer on `production` gates the build too, `deployment: false` still enforcing it.

## Deploying

- Publish a GitHub release on the tag.
- The workflow checks the environment, writes the compose env file, ships it with the compose file and the Caddyfile to `~/igsn/`, runs the migrations, waits for every service to be healthy, reloads Caddy, then smoke-tests `/`, `/api/` and `/admin/`.
- It logs the host into GHCR with the run's token and logs it out at the end, the token expiring with the run.
- Past the image build, the work is two scripts the workflow calls, [setup-ssh.sh](../infra/scripts/setup-ssh.sh) and [deploy-compose.sh](../infra/scripts/deploy-compose.sh).
- Preprod cannot adopt them yet: it runs from `~/` under another compose project with its own Postgres, keeps its certs in `~/certs`, and ships its images with `docker load`.

## Rolling back

- Roll back the code only, the database schema staying at the newer release:

  ```sh
  ssh <host> 'cd igsn && IMAGE_TAG=v1.2.3 docker compose -p igsn --env-file docker-compose.env up -d --no-deps api admin frontend'
  ```

- `--no-deps` skips `migrate`, which fails on a schema that has migrations its image does not know.
- A migration the older code cannot run against takes a database restore, not a rollback.
- A tag no longer cached on the host needs `docker login ghcr.io` first, with a token holding `read:packages`.
- The next release restores the tag recorded in the env file.

## First super admin

- No endpoint or UI grants the `super_admin` flag (ADR 0023, by design).
- After the intended person has signed in once, so their `user` row exists, run once:

  ```sql
  UPDATE "user" SET status = 'accepted', super_admin = true WHERE email = '<email>';
  ```
