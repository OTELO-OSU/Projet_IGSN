import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  mergeRorOrganization,
  rorRecordSchema,
} from "../src/institutional-group/merge-ror-organization.ts";
import {
  ORGANIZATIONS,
  type Organization,
} from "../src/institutional-group/organization.ts";
import { emitOrganizations } from "./emit-organizations.ts";

const ORGANIZATIONS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/institutional-group/organization.ts",
);

// Sending it is what exempts us from rate limiting when they re-enable the
// check (https://ror.readme.io/v2/docs/rest-api).
const clientId = process.env.ROR_CLIENT_ID;
const headers = clientId ? { "Client-Id": clientId } : undefined;

// One flaky request must not kill an annual sync: keep the curated row and log
// the id instead of aborting.
async function refresh(current: Organization): Promise<Organization> {
  process.stderr.write(`fetching ${current.ror}\n`);
  try {
    const response = await fetch(
      `https://api.ror.org/v2/organizations/${encodeURIComponent(current.ror)}`,
      { headers, signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) {
      throw new Error(
        `ROR responded ${response.status} ${response.statusText}`,
      );
    }
    return mergeRorOrganization(
      current,
      rorRecordSchema.parse(await response.json()),
    );
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    process.stderr.write(`could not check ${current.ror}: ${reason}\n`);
    return current;
  }
}

// Sequential on purpose: 140 requests once a year, no reason to hammer ROR.
const merged: Organization[] = [];
for (const current of ORGANIZATIONS) merged.push(await refresh(current));

writeFileSync(ORGANIZATIONS_PATH, emitOrganizations(merged));
