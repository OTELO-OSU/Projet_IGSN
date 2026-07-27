// Regenerate src/sample/scientific-context/organization.ts from a CSV export of
// the internal organizations list (the Excel PY maintains).
//
// Run: pnpm -F @projet-igsn/domain generate-organizations path/to/orgs.csv
//
// Expected CSV columns (a header row is skipped): id, name, acronym, ROR URL.
// The ROR URL may be a full https://ror.org/<id> or a bare id. Rows whose ROR
// repeats an earlier one are dropped (the source list holds a few duplicates).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Organization } from "../src/sample/scientific-context/organization.ts";

import { emitOrganizations } from "./emit-organizations.ts";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("usage: generate-organizations <path-to-csv>");
  process.exit(1);
}

// Minimal CSV parse: one record per line, comma-separated, with optional
// double-quoted fields that may contain commas.
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const c of line) {
    if (inQuotes) {
      if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      fields.push(cur);
      cur = "";
    } else cur += c;
  }
  fields.push(cur);
  return fields;
}

const csv = readFileSync(csvPath, "utf8").trim();
const seen = new Set<string>();
const orgs: Organization[] = [];
for (const line of csv.split("\n").slice(1)) {
  const [, name, acronym, url] = parseLine(line);
  const ror = (url ?? "").replace("https://ror.org/", "").trim();
  if (!ror || seen.has(ror)) continue;
  seen.add(ror);
  orgs.push({ ror, name: name.trim(), acronym: acronym.trim() || null });
}

const target = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/sample/scientific-context/organization.ts",
);
writeFileSync(target, emitOrganizations(orgs));
console.log(`wrote ${orgs.length} organizations to ${target}`);
