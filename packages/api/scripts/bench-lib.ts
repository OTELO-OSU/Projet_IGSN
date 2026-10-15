import { SimpleFaker } from "@faker-js/faker";
import { expandPaths } from "@projet-igsn/domain/sample/path/expand-paths";
import { resolvePathNode } from "@projet-igsn/domain/sample/path/resolve-node";
import { SAMPLE_FACETS } from "@projet-igsn/domain/sample/search/facets";
import { appendFileSync, existsSync } from "node:fs";

const SEARCH_TERMS = ["granite", "basalt", "gneiss", "lime*", "sandstone"];

export const FACET_VALUES: Record<string, readonly string[]> = {};
for (const facet of SAMPLE_FACETS) {
  if (facet.kind === "enum") FACET_VALUES[facet.key] = facet.values;
  if (facet.kind === "hierarchy") {
    const { nodes, roots } = facet.hierarchy;
    FACET_VALUES[facet.key] = expandPaths(nodes, roots).filter(
      (path) => resolvePathNode(nodes, path)?.node.searchable === true,
    );
  }
}

export type MixRequest = {
  query: URLSearchParams;
  facets: number;
  hasAge: boolean;
};

export function seededMix(seed: number): () => MixRequest {
  const random = new SimpleFaker();
  random.seed(seed);
  const int = (min: number, max: number) => random.number.int({ min, max });

  return () => {
    const query = new URLSearchParams();
    if (random.datatype.boolean()) {
      query.set("search", random.helpers.arrayElement(SEARCH_TERMS));
    } else {
      const west = int(-180, 100);
      const south = int(-90, 30);
      const bbox = [west, south, west + int(20, 80), south + int(20, 60)];
      query.set("bbox", bbox.join(","));
    }

    const facets = random.helpers.arrayElements(
      Object.entries(FACET_VALUES),
      int(0, 5),
    );
    for (const [key, values] of facets)
      query.set(key, random.helpers.arrayElement(values));

    const hasAge = random.datatype.boolean(1 / 3);
    if (hasAge) {
      const ageMin = int(0, 400);
      query.set("ageMin", String(ageMin));
      query.set("ageMax", String(ageMin + int(50, 200)));
      query.set("ageUnit", "ma");
    }
    return { query, facets: facets.length, hasAge };
  };
}

export function nearestRank(sorted: readonly number[], p: number): number {
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
}

export type CsvCell = string | number | boolean;

export type Timing = { search: boolean; ms: number; error: boolean };

export function summarizeByKind(
  timings: readonly Timing[],
  elapsedS: number,
): CsvCell[][] {
  const kinds = {
    all: timings,
    search: timings.filter((timing) => timing.search),
    map: timings.filter((timing) => !timing.search),
  };
  return Object.entries(kinds).map(([kind, group]) => {
    const sorted = group.map((timing) => timing.ms).toSorted((a, b) => a - b);
    return [
      kind,
      group.length,
      (group.length / elapsedS).toFixed(2),
      ...[50, 95, 99, 100].map((p) => nearestRank(sorted, p).toFixed(1)),
      group.filter((timing) => timing.error).length,
    ];
  });
}

const csvCell = (value: CsvCell) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function appendCsv(
  file: string,
  header: readonly string[],
  rows: readonly (readonly CsvCell[])[],
): void {
  const lines = rows.map((row) => `${row.map(csvCell).join(",")}\n`).join("");
  appendFileSync(
    file,
    existsSync(file) ? lines : `${header.join(",")}\n${lines}`,
  );
}

export const ENDPOINT_PATHS = {
  list: "samples",
  facets: "samples/facets",
} as const;

export type Endpoint = keyof typeof ENDPOINT_PATHS;

export function parseEndpoints(value: string): Endpoint[] {
  const endpoints = value.split(/[ ,]+/).filter(Boolean);
  const unknown = endpoints.filter(
    (endpoint) => !Object.hasOwn(ENDPOINT_PATHS, endpoint),
  );
  if (endpoints.length === 0 || unknown.length > 0) {
    throw new Error(
      `--endpoints takes ${Object.keys(ENDPOINT_PATHS).join(" and/or ")}, got "${value}"`,
    );
  }
  return endpoints as Endpoint[];
}
