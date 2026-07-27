// Refresh src/sample/scientific-context/organization.ts from ROR, in place: the
// loop is over the existing rows, so the list can neither grow nor shrink.
//
// Run from the repo root: node packages/domain/scripts/sync-organizations.ts
//
// The markdown report goes to stdout and nothing else does, so the workflow can
// redirect it into the PR body. Progress goes to stderr.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeRorOrganization,
  rorRecordSchema,
  type RorRecord,
} from "../src/sample/scientific-context/merge-ror-organization.ts";
import { ORGANIZATIONS } from "../src/sample/scientific-context/organization.ts";

const ORGANIZATIONS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/sample/scientific-context/organization.ts",
);

// ROR does not enforce this today. Sending it is what exempts us from rate
// limiting when they re-enable the check (https://ror.readme.io/v2/docs/rest-api).
const clientId = process.env.ROR_CLIENT_ID;
const headers = clientId ? { "Client-Id": clientId } : undefined;

async function fetchRorRecord(ror: string): Promise<RorRecord> {
  const response = await fetch(
    `https://api.ror.org/v2/organizations/${encodeURIComponent(ror)}`,
    { headers, signal: AbortSignal.timeout(10_000) },
  );
  if (!response.ok) {
    throw new Error(`ROR responded ${response.status} ${response.statusText}`);
  }
  return rorRecordSchema.parse(await response.json());
}

// The report becomes the PR body and organization names are editable upstream at
// ror.org. JSON.stringify escapes newlines, so a name cannot forge a section or
// a total; the code fence stops GitHub linkifying an @mention or firing an
// issue-closing keyword when a maintainer merges the sync PR. Swapping a backtick
// for an apostrophe is a deliberate fidelity loss, since it is what keeps the
// fence unbreakable: do not turn it into a nested fence.
function fence(value: string | null): string {
  return `\`${JSON.stringify(value).replaceAll("`", "'")}\``;
}

// The id comes from our own list, never from the ROR response, so linking it is
// not a sink. Adjudicating a rename means opening the upstream record.
function rorLink(ror: string): string {
  return `[${ror}](https://ror.org/${ror})`;
}

// Replaces one field's literal inside one row, leaving the rest of the file
// byte for byte as authored. The alternative, re-emitting the whole file from a
// template, would be a second definition of organization.ts competing with the
// one in generate-organizations.ts, and would reflow every row on every sync.
// So: organization.ts stays the only place the list is defined.
//
// The search is bounded to this row's object literal (a row has no nested
// braces), so an identical value in a later row can never be hit, and a missing
// anchor throws rather than writing a half-patched file.
function patchField(
  source: string,
  ror: string,
  field: "name" | "acronym",
  from: string | null,
  to: string | null,
): string {
  const anchor = source.indexOf(`ror: ${JSON.stringify(ror)}`);
  if (anchor === -1) throw new Error(`${ror}: row not found`);
  const rowEnd = source.indexOf("}", anchor);
  const needle = `${field}: ${JSON.stringify(from)}`;
  const at = source.indexOf(needle, anchor);
  if (at === -1 || at > rowEnd) {
    throw new Error(
      `${ror}: ${field} literal ${JSON.stringify(from)} not found`,
    );
  }
  return (
    source.slice(0, at) +
    `${field}: ${JSON.stringify(to)}` +
    source.slice(at + needle.length)
  );
}

let source = readFileSync(ORGANIZATIONS_PATH, "utf8");
const rowCountBefore = source.split('ror: "').length;
const changes: string[] = [];
const inactive: string[] = [];
const unchecked: string[] = [];
let changedRows = 0;

// Sequential on purpose: 140 requests once a year, no reason to hammer ROR.
for (const current of ORGANIZATIONS) {
  process.stderr.write(`fetching ${current.ror}\n`);
  try {
    const record = await fetchRorRecord(current.ror);
    const next = mergeRorOrganization(current, record);
    const fields: string[] = [];
    if (next.name !== current.name) {
      source = patchField(source, current.ror, "name", current.name, next.name);
      fields.push(`name: ${fence(current.name)} -> ${fence(next.name)}`);
    }
    if (next.acronym !== current.acronym) {
      source = patchField(
        source,
        current.ror,
        "acronym",
        current.acronym,
        next.acronym,
      );
      fields.push(
        `acronym: ${fence(current.acronym)} -> ${fence(next.acronym)}`,
      );
    }
    if (fields.length > 0) changedRows += 1;
    changes.push(
      ...fields.map((field) => `- ${rorLink(current.ror)} ${field}`),
    );
    if (record.status !== "active") {
      inactive.push(
        `- ${rorLink(current.ror)} ${fence(next.name)} status: ${fence(record.status)}`,
      );
    }
  } catch (error: unknown) {
    // One flaky request must not kill an annual sync: keep the curated row and
    // report the id instead of aborting.
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`could not check ${current.ror}: ${reason}\n`);
    unchecked.push(
      `- ${rorLink(current.ror)} ${fence(current.name)}: ${fence(reason)}`,
    );
  }
}

// Patching text can only ever swap values, but this list is the reference data
// the whole form depends on, so refuse to write a file that gained or lost a row.
const rowCountAfter = source.split('ror: "').length;
if (rowCountAfter !== rowCountBefore) {
  throw new Error(
    `refusing to write: ${rowCountBefore - 1} rows in, ${rowCountAfter - 1} rows out`,
  );
}
writeFileSync(ORGANIZATIONS_PATH, source);

const report = [
  `${changedRows} of ${ORGANIZATIONS.length} organizations changed, ${inactive.length} no longer active in ROR, ${unchecked.length} not checked.`,
  changes.length > 0 ? `## Changes\n\n${changes.join("\n")}` : "",
  inactive.length > 0
    ? `## No longer active in ROR\n\nKept in the list, status is not stored so it is invisible in the diff.\n\n${inactive.join("\n")}`
    : "",
  unchecked.length > 0
    ? `## Not checked\n\nLeft at their current values.\n\n${unchecked.join("\n")}`
    : "",
]
  .filter((part) => part !== "")
  .join("\n\n");

process.stdout.write(`${report}\n`);
