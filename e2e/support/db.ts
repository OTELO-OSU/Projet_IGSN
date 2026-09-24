import { test as base } from "@playwright/test";
import { execFileSync } from "node:child_process";

import type { Researcher } from "./admin/sign-in";

export type SeededSample = {
  id: string;
  name: string;
  nature: string;
  igsn: string | null;
  status: "draft" | "published" | "withdrawn" | "tombstone";
  owner: string;
  collaborators: { researcher: string; role: "editor" | "contributor" }[];
};

type ResearcherKey =
  | "marie"
  | "jean"
  | "sophie"
  | "pierre"
  | "camille"
  | "luc"
  | "nadia"
  | "theo"
  | "chloe"
  | "hugo";

type ManualGroupName =
  | "ANR CritMet"
  | "ProfilLoire 2024"
  | "OZCAR-RI"
  | "ERC DeepTime"
  | "ChronoAlpes"
  | "MISTRALS PaleoMex"
  | "TelluS SYSTER 2025"
  | "GeoRift"
  | "CarbOcean"
  | "Thesis Girard 2023";

export type Institution = {
  organizationCode: string;
  organization: string;
  osuCode: string;
  osu: string;
  laboratoryCode: string;
  laboratory: string;
  laboratoryAcronym: string;
  managedLaboratory: string;
};

export type World = {
  index: number;
  researchers: Record<
    ResearcherKey,
    Researcher & { id: string; firstname: string; name: string }
  >;
  institutions: Record<Exclude<ResearcherKey, "luc" | "theo">, Institution>;
  manualGroups: Record<ManualGroupName, { id: string; name: string }>;
  serviceAccount: { id: string; name: string };
  samples: SeededSample[];
};

export const SHARED_SEED_ENV = "E2E_SHARED_SEED";

function runSeedScript<T>(script: string, ...args: string[]): T {
  // ponytail: hard-coded to the `igsn-e2e-api-1` container that `make test-e2e` starts.
  const out = execFileSync(
    "docker",
    ["exec", "igsn-e2e-api-1", "node", `scripts/${script}`, ...args],
    { encoding: "utf8" },
  );
  return JSON.parse(out.trim().split("\n").at(-1)!) as T;
}

export const resetAndSeed = () =>
  runSeedScript<SeededSample[]>("reset-and-seed.ts");

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

export const test = base.extend<{ samples: SeededSample[]; world: World }>({
  // oxlint-disable-next-line no-empty-pattern
  samples: async ({}, use) => {
    await use(JSON.parse(process.env[SHARED_SEED_ENV]!) as SeededSample[]);
  },
  // oxlint-disable-next-line no-empty-pattern
  world: async ({}, use, testInfo) => {
    await use(
      runSeedScript<World>("seed-e2e-world.ts", String(testInfo.parallelIndex)),
    );
  },
});

export { expect } from "@playwright/test";
