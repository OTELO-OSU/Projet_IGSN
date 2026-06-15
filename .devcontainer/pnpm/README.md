# PNPM integration

Installs pnpm and persists state in named volumes across container rebuilds:

- `PNPM_HOME` (`/mnt/pnpm`): global bin + store
- the project's `node_modules`, so dependencies don't re-download on every rebuild

Runs `pnpm install` on create.
