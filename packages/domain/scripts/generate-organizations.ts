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
const orgs: { ror: string; name: string; acronym: string | null }[] = [];
for (const line of csv.split("\n").slice(1)) {
  const [, name, acronym, url] = parseLine(line);
  const ror = (url ?? "").replace("https://ror.org/", "").trim();
  if (!ror || seen.has(ror)) continue;
  seen.add(ror);
  orgs.push({ ror, name: name.trim(), acronym: acronym.trim() || null });
}

const rows = orgs
  .map(
    (o) =>
      `  { ror: ${JSON.stringify(o.ror)}, name: ${JSON.stringify(o.name)}, acronym: ${JSON.stringify(o.acronym)} },`,
  )
  .join("\n");

const out = `import { z } from "zod";

// Research organizations with their ROR identifier (Research Organization
// Registry), the internal reference list PY maintains. A sample's funder
// organization and the program chief's research structure both reference an
// organization by its ROR id; the id is the stable code, the name/acronym are
// display data (proper nouns, not translated, so not in the i18n catalog).
//
// Generated from a CSV export; do not edit by hand for bulk changes. Regenerate
// with: pnpm -F @projet-igsn/domain generate-organizations path/to/orgs.csv
// A one-off addition can be appended to ORGANIZATIONS directly (keep ROR ids
// unique). Promote to a DB table only if orgs must be editable at runtime.
export type Organization = {
  ror: string;
  name: string;
  acronym: string | null;
};

export const ORGANIZATIONS: readonly Organization[] = [
${rows}
];

// A ROR identifier: nine chars, a leading 0 then a base32 body and a two-digit
// checksum (https://ror.readme.io/docs/identifier). Validated by format, not by
// membership in ORGANIZATIONS, so the list can grow without rejecting values
// already stored.
export const organizationRorSchema = z
  .string()
  .regex(/^0[0-9a-hj-km-np-tv-z]{6}[0-9]{2}$/, "invalid ROR identifier");

export type OrganizationRor = z.infer<typeof organizationRorSchema>;
`;

const target = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/sample/scientific-context/organization.ts",
);
writeFileSync(target, out);
console.log(`wrote ${orgs.length} organizations to ${target}`);
