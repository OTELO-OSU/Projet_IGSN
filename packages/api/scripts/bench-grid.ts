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
import postgres from "postgres";

import type { DB } from "../src/db.ts";

import { dbConfig } from "../src/db-config.ts";
import { listPublishedSamples } from "../src/sample/service/list-sample.ts";
import { appendCsv, type CsvCell } from "./bench-lib.ts";

const FILTERS = [
  ["material", "rock_and_sediment.rock"],
  ["nature", "hand_sample"],
  ["type", "core"],
  ["institutionalOrganization", "00jjx8s55"],
  ["collectionMethod", "coring"],
] as const;
const FILTER_COUNTS = [0, 1, 3, 5];

type Plan = { "Execution Time": number; "Planning Time": number };

const { values } = parseArgs({
  options: {
    size: { type: "string", default: "" },
    runs: { type: "string", default: "30" },
    out: { type: "string", default: "benchmark-results" },
  },
});
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
  "top-contributor": {
    contributor: await mostCommon("user_sample", "user_id"),
  },
  "top-manual-group": {
    manualGroup: await mostCommon("sample_manual_group", "group_id"),
  },
};

async function explain(params: ListSamplesQuery) {
  recorded = [];
  await listPublishedSamples(db, params);
  const statements = recorded.filter(
    ({ sql }) => !/^(begin|commit|rollback)\b/i.test(sql),
  );
  recorded = undefined;

  return db.transaction().execute(async (trx) => {
    const explained = [];
    for (const statement of statements) {
      if (statement.sql.startsWith("select set_config(")) {
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

for (const [base, baseQuery] of Object.entries(BASES)) {
  for (const filters of FILTER_COUNTS) {
    const params = listSamplesQuerySchema.parse({
      ...baseQuery,
      ...Object.fromEntries(FILTERS.slice(0, filters)),
    });
    const { total: matched } = await listPublishedSamples(db, params);
    const labels: CsvCell[] = [values.size, base, filters, matched];

    const statements = await explain(params);
    appendCsv(
      out("explain.csv"),
      [
        "size",
        "case",
        "filters",
        "matched_rows",
        "statement",
        "execution_ms",
        "planning_ms",
        "plan_file",
      ],
      statements.map((statement, index) => {
        const planFile = `plans/${values.size}-${base}-${filters}-${index + 1}.json`;
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
      await listPublishedSamples(db, params);
      const ms = (performance.now() - start).toFixed(2);
      timings.push([...labels, run, ms, loadavg()[0]!.toFixed(2)]);
    }
    appendCsv(
      out("grid.csv"),
      ["size", "case", "filters", "matched_rows", "run", "ms", "load_avg"],
      timings,
    );
    console.info(`${values.size} ${base} +${filters}: ${matched} matched`);
  }
}

await db.destroy();
