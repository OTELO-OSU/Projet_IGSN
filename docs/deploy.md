# Deploy

## Overview

- One stack definition, `infra/stack/`, is deployed twice on one shared Portainer, as the stacks of the GitLab environments `preproduction` and `production`.
- GitLab CI (`.gitlab-ci.yml`) builds the api, admin, frontend and caddy images and pushes them to the GitLab Container Registry.
- It then updates the Portainer stack through its API (`infra/scripts/deploy-portainer.sh`).
- The GitHub repo stays the development home (PRs, `check.yml`).
- `.github/workflows/mirror-pytheas.yml` mirrors `main` and `v*` tags to `gitlab.osupytheas.fr/insu/Projet_IGSN`.
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
- The "Deploy preprod" GitHub workflow (Actions > Deploy preprod > Run workflow, pick any branch) force-pushes that branch to the GitLab `preprod` branch, which deploys to preproduction.
- A `vX.Y.Z` tag (a GitHub release) deploys to production, only when it is the highest such tag.
- An older `vX.Y.Z` tag builds its images, then skips the deploy and ends green.
- Any other tag (`-rc`) runs nothing.
- Images are tagged `preprod-<short sha>` and with the release tag.
- Until Portainer is connected, the deploy job ends "passed with warnings" naming the missing variables, the images already pushed.

## GitLab setup

- Enable the Container Registry.
- Provide a runner able to run docker-in-docker (privileged).
- Protect `main`, `preprod` and the `v*` tags.
- Allow the mirror token's user (Maintainer) to force push on `main` and `preprod` and to create `v*` tags.
- Define the variables as the next section says.
- Set the registry cleanup policy (see [Storage](#storage)).

## Defining the variables in GitLab

[deploy-variables.md](deploy-variables.md) lists every variable, whether it is required, and whether it is a secret.

- You need the Maintainer role on the GitLab project.
- Open the project, then **Settings > CI/CD**, and expand **Variables**.
- Select **Add variable** once per variable and environment.
- **Key**: the name from the list, exactly.
- **Value**: the value for that environment, on one line.
- **Type**: **Variable**.
- **Environment scope**: `preproduction` or `production`, so each environment gets its own value.
- A value identical in both environments can be added once with the scope **All (default)** (`*`) instead.
- **Protect variable**: checked, so only pipelines on the protected `main`, `preprod` and `v*` refs see it.
- Pipelines run only on those refs, so an unprotected ref gets no variable and its deploy stops on the missing ones.
- **Visibility**: **Masked and hidden** for a row whose kind is `secret`, **Visible** otherwise.
- GitLab refuses to mask a value that is too short or uses unsupported characters: regenerate such a secret rather than leaving it visible.
- **Expand variable reference**: unchecked, so a `$` in a value reaches the stack as written.
- Skip the `pipeline` rows: `.gitlab-ci.yml` sets them.
- An optional variable left out takes the default shown in the list.
- A changed value takes effect on the next pipeline.
- A value baked into a bundle (`DOMAIN`, `OIDC_*`, `UPLOAD_LIMIT`, `SAMPLE_LOCK_POLL_SECONDS`) needs a whole new pipeline, since re-running the deploy job alone keeps the old value in the bundle.

## Portainer setup

Once per environment:

- Add the GitLab registry with a deploy token holding `read_registry`, and record its expiry.
- Create the stack in the target Portainer environment (Web editor, any placeholder compose).
- Its id from the URL is `PORTAINER_STACK_ID`, and the environment id is `PORTAINER_ENDPOINT_ID`.
- An access token of the deploy user is `PORTAINER_API_KEY`.
- Give each stack its own `HTTP_PORT`.
- Never edit the stack's env in Portainer: each deploy replaces the whole list from GitLab.

## Deploying

- The job checks the variables, then PUTs the compose file and env to the stack with `pullImage` and `prune`.
- Portainer runs `migrate`, then the apps.
- The job then smoke-tests `/`, `/api/` and `/admin/`.
- A deploy of a branch already at the same commit pushes nothing, so re-run its last GitLab pipeline instead.
- A branch carrying a migration leaves preprod's schema ahead of `main`.
- Later `main` deploys then fail at `migrate` until that branch merges or the preprod database volume is reset.
- `DATABASE_PASSWORD` is read by Postgres only when it creates its volume.
- Changing it later in GitLab breaks the api until the role's password is changed too.

## Rolling back

- Set `IMAGE_TAG` to the older tag in the Portainer stack and update it.
- Do so only when no migration landed since, as the older `migrate` refuses a schema with migrations it does not know.
- Otherwise roll forward or restore.
- The next deploy restores GitLab's values.

## First super admin

- No endpoint or UI grants the `super_admin` flag (ADR 0023, by design).
- After the intended person has signed in once, so their `user` row exists, run once per environment with `docker exec` on the stack's `postgres` container (Portainer's console works too):

  ```sql
  UPDATE "user" SET status = 'accepted', super_admin = true WHERE email = '<email>';
  ```

## Storage

Every preproduction deploy pushes four new `preprod-<short sha>` images, which pile up in the GitLab registry and on the Portainer host until something removes them.

### GitLab registry cleanup policy

- Open the project, then **Settings > Packages and registries**, expand **Container registry**, and under **Container registry cleanup policies** select **Set cleanup rules**.
- **Toggle**: on.
- **Run cleanup**: every day.
- **Keep the most recent**: 5 tags per image.
- **Keep tags matching**: `v\d+\.\d+\.\d+`, so release images are never removed.
- **Remove tags older than**: 14 days.
- **Remove tags matching**: `preprod-.*`.
- Select **Save**.
- A tag is removed only when it matches the remove pattern, not the keep pattern, is not among the 5 most recent, and is older than 14 days.
- The policy removes tags only: the GitLab instance admin frees the disk with the registry garbage collection, unless the registry runs online garbage collection.

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
