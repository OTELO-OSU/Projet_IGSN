# 13. Bind-mount hot source into the dev containers

## Status

Accepted

## Context

The dev stack (`make dev`) delivered source changes to the running containers
with compose watch `sync`, which copies each changed file into the container as
file events arrive. Event-based sync can silently drop changes during bulk
writes (a `git checkout`, a rebase, hundreds of files at once), leaving a
container serving a stale mixed tree: one package at an old commit next to
callers at the new one. This produced confusing false-positive runtime errors
(a caller passing props a stale component no longer has) that only a full stack
restart cured.

## Decision

The hot paths (`src/` of each consumed package, plus `messages/` for the apps)
are bind mounts in `docker-compose.dev.yml`, so the container reads the host
files directly and cannot drift. Compose watch stays for the cold paths only:
config files at the package root, `sync+restart` on `tsconfig.base.json`,
`rebuild` on `pnpm-lock.yaml`.

Consequences of mounting read-write where the dev server generates files
through the mount (paraglide output, `routeTree.gen.ts`):

- The `admin` and `frontend` images run as `node` (uid 1000, matching the
  devcontainer user) with `/app` node-owned, so generated files land on the
  host owned by the host user, not root. This also drops root in dev as a side
  effect.
- The `api` writes nothing into `src`, so its mounts are read-only and its
  image is unchanged.

Node_modules are never mounted: they stay container-side, installed at image
build, exactly as before.

## Consequences

- Source changes reach Vite via native inotify (same kernel in the
  devcontainer's docker-in-docker), so HMR keeps working and staleness by
  dropped sync events is gone.
- Bind mounts require the compose paths to exist on the daemon's filesystem;
  this holds for docker-in-docker (and any native Linux host) but would not for
  a remote Docker daemon.
- Files created by the app containers in mounted paths appear on the host;
  that is the intended behavior for generated sources.
