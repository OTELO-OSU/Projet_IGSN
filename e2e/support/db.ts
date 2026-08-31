import { test as base } from "@playwright/test";
import { execFileSync } from "node:child_process";

export type SeededSample = {
  id: string;
  name: string;
  nature: string;
  igsn: string | null;
  status: "draft" | "published" | "withdrawn" | "tombstone";
  owner: string;
  collaborators: { researcher: string; role: "editor" | "contributor" }[];
};

function resetAndSeed(): SeededSample[] {
  // ponytail: hard-coded to the `igsn-e2e-api-1` container that `make test-e2e`
  // starts. Per-test seed is a few seconds — fine at workers:1; move to global-setup if it grows.
  const out = execFileSync(
    "docker",
    ["exec", "igsn-e2e-api-1", "node", "scripts/reset-and-seed.ts"],
    { encoding: "utf8" },
  );
  const lastLine = out.trim().split("\n").at(-1) ?? "[]";
  return JSON.parse(lastLine) as SeededSample[];
}

export function sampleNamed(samples: SeededSample[], name: string) {
  const sample = samples.find((s) => s.name === name);
  if (!sample?.igsn) throw new Error(`seed must publish "${name}"`);
  return { ...sample, igsn: sample.igsn };
}

export function published(samples: SeededSample[]) {
  return {
    basalt: sampleNamed(samples, "Basalt 42").igsn,
    granite: sampleNamed(samples, "Granite 7").igsn,
  };
}

const sampleWithStatus =
  (status: SeededSample["status"]) => (samples: SeededSample[]) => {
    const sample = samples.find((s) => s.status === status);
    if (!sample?.igsn)
      throw new Error(`seed must hold a ${status} sample with an igsn`);
    return { igsn: sample.igsn, name: sample.name };
  };

export const withdrawn = sampleWithStatus("withdrawn");
export const tombstone = sampleWithStatus("tombstone");

export const test = base.extend<{ samples: SeededSample[] }>({
  samples: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(resetAndSeed());
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
