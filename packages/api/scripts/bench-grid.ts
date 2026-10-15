import {
  sampleMapPointsQuerySchema,
  sampleMapPointsResponseSchema,
} from "@projet-igsn/domain/sample/map/model";
import {
  type ListSamplesQuery,
  listSamplesQuerySchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { CompiledQuery, Kysely, sql } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadavg } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import postgres from "postgres";

import type { DB } from "../src/db.ts";
import type { Transactional } from "../src/transaction.ts";

import { dbConfig } from "../src/db-config.ts";
import { countPublishedFacets } from "../src/sample/service/count-facets.ts";
import { listPublishedSamples } from "../src/sample/service/list-sample.ts";
import { mapPublishedPointsJson } from "../src/sample/service/map-points.ts";
import {
  appendCsv,
  type CsvCell,
  type Endpoint,
  parseEndpoints,
} from "./bench-lib.ts";

const FILTERS = [
  ["material", "rock_and_sediment.rock"],
  ["nature", "hand_sample"],
  ["type", "core"],
  ["institutionalOrganization", "00jjx8s55"],
  ["collectionMethod", "coring"],
] as const;
const FILTER_COUNTS = [0, 1, 3, 5];

type Call<Params> = (db: Transactional<DB>, params: Params) => Promise<unknown>;
const CALLS: Record<Exclude<Endpoint, "map">, Call<ListSamplesQuery>> = {
  list: listPublishedSamples,
  facets: countPublishedFacets,
};

type Plan = { "Execution Time": number; "Planning Time": number };

const { values } = parseArgs({
  options: {
    size: { type: "string", default: "" },
    runs: { type: "string", default: "30" },
    endpoints: { type: "string", default: "list,facets" },
    out: { type: "string", default: "benchmark-results" },
  },
});
const endpoints = parseEndpoints(values.endpoints);
const out = (file: string) => path.join(values.out, file);
mkdirSync(out("plans"), { recursive: true });

let recorded: CompiledQuery[] | undefined;
const db = new Kysely<DB>({
  dialect: new PostgresJSDialect({ postgres: postgres(dbConfig()) }),
  log: (event) => {
    if (event.level === "query") recorded?.push(event.query);
  },
});

async function mostCommon(table: string, column: string): Promise<string> {
  const { rows } = await sql<{ id: string }>`
    select ${sql.ref(column)} as id from ${sql.table(table)}
    group by 1 order by count(*) desc limit 1
  `.execute(db);
  if (!rows[0]) throw new Error(`${table} is empty, run seed:bench first`);
  return rows[0].id;
}

const BASES: Record<string, Record<string, string>> = {
  "search-granite": { search: "granite" },
  "bbox-western-europe": { bbox: "-10,36,20,60" },
  "bbox-world": { bbox: "-180,-90,180,90" },
  "viewport-world": { viewport: "-180,-90,180,90" },
  "top-contributor": {
    contributor: await mostCommon("user_sample", "user_id"),
  },
  "top-manual-group": {
    manualGroup: await mostCommon("sample_manual_group", "group_id"),
  },
};

async function explain<Params>(call: Call<Params>, params: Params) {
  recorded = [];
  await call(db, params);
  const statements = recorded.filter(
    ({ sql }) => !/^(begin|commit|rollback)\b/i.test(sql),
  );
  recorded = undefined;

  return db.transaction().execute(async (trx) => {
    const explained = [];
    for (const statement of statements) {
      if (/^(select set_config\(|set )/i.test(statement.sql)) {
        await trx.executeQuery(statement);
        continue;
      }
      const { rows } = await trx.executeQuery<{ "QUERY PLAN": [Plan] }>(
        CompiledQuery.raw(
          `explain (analyze, buffers, settings, format json) ${statement.sql}`,
          [...statement.parameters],
        ),
      );
      explained.push({
        sql: statement.sql,
        parameters: statement.parameters,
        plan: rows[0]!["QUERY PLAN"][0],
      });
    }
    return explained;
  });
}

type Measured<Params> = {
  call: Call<Params>;
  params: Params;
  base: string;
  filters: number;
  matched: number;
  endpoint: Endpoint;
};

async function measure<Params>({
  call,
  params,
  base,
  filters,
  matched,
  endpoint,
}: Measured<Params>) {
  const labels: CsvCell[] = [values.size, base, filters, matched, endpoint];

  const statements = await explain(call, params);
  appendCsv(
    out("explain.csv"),
    [
      "size",
      "case",
      "filters",
      "matched_rows",
      "endpoint",
      "statement",
      "execution_ms",
      "planning_ms",
      "plan_file",
    ],
    statements.map((statement, index) => {
      const planFile = `plans/${values.size}-${base}-${filters}-${endpoint}-${index + 1}.json`;
      writeFileSync(out(planFile), JSON.stringify(statement, null, 2));
      const { plan } = statement;
      return [
        ...labels,
        index + 1,
        plan["Execution Time"],
        plan["Planning Time"],
        planFile,
      ];
    }),
  );

  const timings: CsvCell[][] = [];
  for (let run = 1; run <= Number(values.runs); run++) {
    const start = performance.now();
    await call(db, params);
    const ms = (performance.now() - start).toFixed(2);
    timings.push([...labels, run, ms, loadavg()[0]!.toFixed(2)]);
  }
  appendCsv(
    out("grid.csv"),
    [
      "size",
      "case",
      "filters",
      "matched_rows",
      "endpoint",
      "run",
      "ms",
      "load_avg",
    ],
    timings,
  );
}

const listEndpoints = endpoints.filter((endpoint) => endpoint !== "map");
if (listEndpoints.length > 0) {
  for (const [base, baseQuery] of Object.entries(BASES)) {
    for (const filters of FILTER_COUNTS) {
      const params = listSamplesQuerySchema.parse({
        ...baseQuery,
        ...Object.fromEntries(FILTERS.slice(0, filters)),
      });
      const { total: matched = 0 } = await listPublishedSamples(db, params);

      for (const endpoint of listEndpoints) {
        await measure({
          call: CALLS[endpoint],
          params,
          base,
          filters,
          matched,
          endpoint,
        });
      }
      console.info(`${values.size} ${base} +${filters}: ${matched} matched`);
    }
  }
}

if (endpoints.includes("map")) {
  for (const filters of FILTER_COUNTS) {
    const params = sampleMapPointsQuerySchema.parse(
      Object.fromEntries(FILTERS.slice(0, filters)),
    );
    const json = await mapPublishedPointsJson(db, params);
    const matched = sampleMapPointsResponseSchema.parse(JSON.parse(json)).data
      .numbers.length;

    await measure({
      call: mapPublishedPointsJson,
      params,
      base: "map-points",
      filters,
      matched,
      endpoint: "map",
    });
    console.info(`${values.size} map-points +${filters}: ${matched} matched`);
    if (filters === 0) {
      const payload = Buffer.from(json);
      console.info(
        `${values.size} map-points payload: ${payload.byteLength} bytes raw, ${gzipSync(payload).byteLength} bytes gzip`,
      );
    }
  }
}

await db.destroy();
