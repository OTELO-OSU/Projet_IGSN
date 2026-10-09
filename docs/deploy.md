# Deploy

## Overview

- One stack definition, `infra/stack/`, is deployed twice on one shared Portainer, as the stacks of the GitHub environments `preproduction` and `production`.
- GitHub Actions (`.github/workflows/deploy.yml`) builds the api, admin, frontend and caddy images and pushes them to GHCR.
- It then connects to the infra team's VPN with openfortivpn and updates the Portainer stack through its API (`infra/scripts/deploy-portainer.sh`).
- Postgres runs in the stack on the `paradedb/paradedb` image, its data in the `paradedb-data` volume, never exposed off the host.
- Attachments live in the `attachments` volume.
- Auth uses the GaiaData SSO, the test SSO for preprod.
- Outbound mail goes through a transactional-mail provider's SMTP endpoint (STARTTLS on 587), set with the `SMTP_*` variables.
- The sending domain must be verified in the provider's dashboard, and a wrong `SMTP_PASSWORD` only surfaces at send time, so send one test mail after the first deploy.
- Migrations run as a one-off `migrate` service that must complete before the apps start.

## Edge

- Caddy serves plain HTTP on `HTTP_PORT`, behind the infra team's TLS reverse proxy (still to be confirmed with them).
- It path-routes `/api` (prefix stripped), `/admin`, and the rest to the frontend, and sets the security headers.
- It trusts only private-range peers for the visitor IP (`trusted_proxies_strict`), so the api's rate limits key on the real client.
- `TRUST_PROXY_HEADERS=true` on the api is mandatory, or every visitor shares one bucket; see [ADR 0029](adr/0029-api-rate-limiting.md).
- `HTTP_PORT` must be reachable from the infra proxy only (host firewall).
- Otherwise Docker can forward a direct hit through its userland proxy (IPv6 for instance), which Caddy then sees as a private peer.
- Caddy would then trust that hit's forged `X-Forwarded-For`, letting a client dodge the rate limits.

## What triggers a deploy

- A push to `main` deploys to preproduction.
- **Actions > Deploy > Run workflow** on any branch deploys that branch to preproduction (or `gh workflow run deploy.yml --ref <branch>`).
- GitHub offers that button only once `deploy.yml` is on `main`.
- A manual run on a tag is skipped, so production deploys only from a pushed tag.
- A `vX.Y.Z` tag (a GitHub release) deploys to production, only when it is the highest such tag.
- An older `vX.Y.Z` tag builds its images, then skips the deploy and ends green.
- Any other tag (`-rc`) runs nothing.
- Images are tagged `preprod-<short sha>` and with the release tag.
- Until Portainer is connected, the run ends green with a warning naming the missing variables, the images already pushed.

## GitHub setup

- Create the environments `preproduction` and `production` (**Settings > Environments**).
- Restrict `production`'s deployment branches and tags to the tags `v*`.
- Leave `preproduction` unrestricted, or a manual run from a branch is refused.
- Add a tag ruleset on `v*` (**Settings > Rules > Rulesets**) restricting creations, updates and deletions to maintainers, or any writer can deploy to production by pushing a tag.
- Define the variables as the next section says.
- After the first run, make the four `api`, `admin`, `frontend` and `caddy` packages public (package page > **Package settings** > **Change visibility**), so Portainer pulls them anonymously.
- Delete the now unused `PYTHEAS_GITLAB_TOKEN` repository secret.

## Defining the variables in GitHub

[deploy-variables.md](deploy-variables.md) lists every variable, whether it is required, and whether it is a secret.

- Open **Settings > Environments**, then the environment.
- Select **Add environment secret** for a row whose kind is `secret`, **Add environment variable** for a row whose kind is `variable`.
- **Name**: the name from the list, exactly.
- **Value**: the value for that environment, on one line.
- Set every value in each environment, none at repository level.
- A variable is never masked and this public repo's run logs are public, so a `secret` row is never a variable.
- Skip the `pipeline` rows: the workflow sets them.
- An optional variable left out takes the default shown in the list.
- Every run rebuilds the bundles, so a changed value needs a new run only.

## Portainer setup

Once per environment:

- Create the stack in the target Portainer environment (Web editor, any placeholder compose).
- Its id from the URL is `PORTAINER_STACK_ID`, and the environment id is `PORTAINER_ENDPOINT_ID`.
- An access token of the deploy user is `PORTAINER_API_KEY`.
- Give each stack its own `HTTP_PORT`.
- Never edit the stack's env in Portainer: each deploy replaces the whole list from GitHub.
- The deploy reaches Portainer through the infra team's Fortinet VPN, so ask them for an account without OTP, set in the `VPN_*` variables.
- `PORTAINER_URL` must be reachable through that tunnel.

## Deploying

- The job checks the variables, connects the VPN, then PUTs the compose file and env to the stack with `pullImage` and `prune`.
- Portainer runs `migrate`, then the apps.
- The job then smoke-tests `/`, `/api/` and `/admin/`.
- A branch carrying a migration leaves preprod's schema ahead of `main`.
- Later `main` deploys then fail at `migrate` until that branch merges or the preprod database volume is reset.
- `DATABASE_PASSWORD` is read by Postgres only when it creates its volume.
- Changing it later in GitHub breaks the api until the role's password is changed too.

## Rolling back

- Set `IMAGE_TAG` to the older tag in the Portainer stack and update it.
- Do so only when no migration landed since, as the older `migrate` refuses a schema with migrations it does not know.
- Otherwise roll forward or restore.
- The next deploy restores GitHub's values.

## First super admin

- No endpoint or UI grants the `super_admin` flag (ADR 0023, by design).
- After the intended person has signed in once, so their `user` row exists, run once per environment with `docker exec` on the stack's `postgres` container (Portainer's console works too):

  ```sql
  UPDATE "user" SET status = 'accepted', super_admin = true WHERE email = '<email>';
  ```

## Storage

Every preproduction deploy pushes four new `preprod-<short sha>` images, which pile up in GHCR and on the Portainer host until something removes them.

### GHCR

- GHCR keeps every `preprod-<short sha>` tag, free for public packages.
- Delete old ones from the package page if needed.

### Portainer host

- Each deploy pulls the new images and leaves the previous ones on the host, which prod shares.
- Ask the infra team to remove the unused preprod images periodically, in Portainer (**Images**, filter **Unused**, select the `preprod-` tags, **Remove**) or with:

  ```sh
  docker images --format '{{.Repository}}:{{.Tag}}' | grep ':preprod-' | xargs -r docker rmi
  ```

- `docker rmi` refuses an image a container still uses, so the running stack keeps its images.
- Never prune every unused image on this shared host: it would also remove other teams' images.

## Backups

- Nothing backs up the database or the attachments volume yet.
