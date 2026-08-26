import { test as base } from "@playwright/test";
import { execFileSync } from "node:child_process";

export type SeededSample = {
  id: string;
  name: string;
  nature: string;
  igsn: string | null;
  published: boolean;
  // The RESEARCHERS key of the sample's owner; specs group by it to assert
  // per-researcher visibility.
  owner: string;
  collaborators: { researcher: string; role: "editor" | "contributor" }[];
};

function resetAndSeed(): SeededSample[] {
  // ponytail: hard-coded to the `igsn-e2e-api-1` container that `make test-e2e`
  // starts (compose project `igsn-e2e`, service `api`); the E2E suite only runs
  // through that recipe. `docker exec` on the fixed name skips the compose-file
  // parse that `docker compose exec` pays per call. Per-test seed is a few
  // seconds — fine at workers:1; move to global-setup if it grows.
  // Run node directly (not `pnpm run`): prod runs as USER node but /app is
  // root-owned, and `pnpm run` writes a temp file there (EACCES). WORKDIR is
  // /app/packages/api.
  const out = execFileSync(
    "docker",
    ["exec", "igsn-e2e-api-1", "node", "scripts/reset-and-seed.ts"],
    { encoding: "utf8" },
  );
  const lastLine = out.trim().split("\n").at(-1) ?? "[]";
  return JSON.parse(lastLine) as SeededSample[];
}

export function published(samples: SeededSample[]) {
  const igsnOf = (name: string) => {
    const igsn = samples.find((s) => s.name === name)?.igsn;
    if (!igsn) throw new Error(`seed must publish "${name}"`);
    return igsn;
  };
  return { basalt: igsnOf("Basalt 42"), granite: igsnOf("Granite 7") };
}

export const test = base.extend<{ samples: SeededSample[] }>({
  samples: [
    // Playwright requires the destructuring pattern for the fixtures arg; this
    // fixture depends on none.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(resetAndSeed());
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
