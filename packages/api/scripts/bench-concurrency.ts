import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  appendCsv,
  type CsvCell,
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
    out: { type: "string", default: "benchmark-results" },
  },
});
mkdirSync(values.out, { recursive: true });

async function send(query: URLSearchParams): Promise<string> {
  try {
    const response = await fetch(`${values.url}/samples?${query.toString()}`);
    await response.arrayBuffer();
    return String(response.status);
  } catch {
    return "network_error";
  }
}

for (const users of values.users.split(/[ ,]+/).map(Number)) {
  const next = seededMix(SEED);
  const rows: CsvCell[][] = [];
  const timings: Timing[] = [];
  let sent = 0;
  const start = performance.now();
  const deadline = start + Number(values.duration) * 1000;

  async function virtualUser() {
    while (performance.now() < deadline) {
      const index = sent++;
      const { query, facets, hasAge } = next();
      const startedAt = new Date().toISOString();
      const requestStart = performance.now();
      const status = await send(query);
      const ms = performance.now() - requestStart;
      timings.push({
        search: query.has("search"),
        ms,
        error: status !== "200",
      });
      rows[index] = [
        values.size,
        users,
        index,
        facets,
        query.has("search"),
        query.has("bbox"),
        hasAge,
        status,
        ms.toFixed(2),
        startedAt,
      ];
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
      "filters_count",
      "has_search",
      "has_bbox",
      "has_age",
      "status",
      "ms",
      "started_at",
    ],
    rows,
  );

  const summary = summarizeByKind(timings, elapsedS);
  appendCsv(
    path.join(values.out, "concurrency-summary.csv"),
    [
      "size",
      "users",
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
