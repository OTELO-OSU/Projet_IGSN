import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  appendCsv,
  type CsvCell,
  type Endpoint,
  ENDPOINT_PATHS,
  parseEndpoints,
  seededMix,
  summarizeByKind,
  type Timing,
} from "./bench-lib.ts";

const SEED = 286;

const { values } = parseArgs({
  options: {
    size: { type: "string", default: "" },
    users: { type: "string", default: "1,5,10,20" },
    duration: { type: "string", default: "30" },
    url: { type: "string", default: "http://localhost:3000/api" },
    endpoints: { type: "string", default: "list,facets" },
    out: { type: "string", default: "benchmark-results" },
  },
});
const endpoints = parseEndpoints(values.endpoints);
mkdirSync(values.out, { recursive: true });

async function send(
  endpoint: Endpoint,
  query: URLSearchParams,
): Promise<{ status: string; ms: number }> {
  const start = performance.now();
  try {
    const response = await fetch(
      `${values.url}/${ENDPOINT_PATHS[endpoint]}?${query.toString()}`,
    );
    await response.arrayBuffer();
    return { status: String(response.status), ms: performance.now() - start };
  } catch {
    return { status: "network_error", ms: performance.now() - start };
  }
}

for (const users of values.users.split(/[ ,]+/).map(Number)) {
  const next = seededMix(SEED);
  const rows: CsvCell[][][] = [];
  const timings = new Map<Endpoint, Timing[]>(
    endpoints.map((endpoint) => [endpoint, []]),
  );
  let sent = 0;
  const start = performance.now();
  const deadline = start + Number(values.duration) * 1000;

  async function virtualUser() {
    while (performance.now() < deadline) {
      const index = sent++;
      const { query, facets, hasAge } = next();
      const startedAt = new Date().toISOString();
      const responses = await Promise.all(
        endpoints.map((endpoint) => send(endpoint, query)),
      );
      rows[index] = responses.map(({ status, ms }, position) => {
        const endpoint = endpoints[position]!;
        timings.get(endpoint)!.push({
          search: query.has("search"),
          ms,
          error: status !== "200",
        });
        return [
          values.size,
          users,
          index,
          endpoint,
          facets,
          query.has("search"),
          query.has("bbox"),
          hasAge,
          status,
          ms.toFixed(2),
          startedAt,
        ];
      });
    }
  }
  await Promise.all(Array.from({ length: users }, virtualUser));
  const elapsedS = (performance.now() - start) / 1000;

  appendCsv(
    path.join(values.out, "concurrency.csv"),
    [
      "size",
      "users",
      "request_index",
      "endpoint",
      "filters_count",
      "has_search",
      "has_bbox",
      "has_age",
      "status",
      "ms",
      "started_at",
    ],
    rows.flat(),
  );

  const summary = endpoints.flatMap((endpoint) =>
    summarizeByKind(timings.get(endpoint)!, elapsedS).map((row) => [
      endpoint,
      ...row,
    ]),
  );
  appendCsv(
    path.join(values.out, "concurrency-summary.csv"),
    [
      "size",
      "users",
      "endpoint",
      "kind",
      "requests",
      "rps",
      "p50",
      "p95",
      "p99",
      "max",
      "errors",
    ],
    summary.map((row) => [values.size, users, ...row]),
  );
  for (const row of summary)
    console.info(`${values.size} samples, ${users} users: ${row.join(" ")}`);
}
