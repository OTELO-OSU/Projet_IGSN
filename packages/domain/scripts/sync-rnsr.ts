import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LABORATORIES } from "../src/institutional-group/laboratory.ts";
import { OSUS } from "../src/institutional-group/osu.ts";
import { emitLaboratories, emitOsus } from "./emit-institutions.ts";
import { fetchRnsrRecords } from "./fetch-rnsr-records.ts";
import { mergeRnsr } from "./merge-rnsr.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

try {
  const merged = mergeRnsr(
    { laboratories: LABORATORIES, osus: OSUS },
    await fetchRnsrRecords(),
  );
  for (const note of merged.notes) process.stderr.write(`${note}\n`);

  writeFileSync(
    join(HERE, "../src/institutional-group/laboratory.ts"),
    emitLaboratories(merged.laboratories),
  );
  writeFileSync(
    join(HERE, "../src/institutional-group/osu.ts"),
    emitOsus(merged.osus),
  );
} catch (error: unknown) {
  const reason = error instanceof Error ? error.message : String(error);
  process.stderr.write(`RNSR sync failed: ${reason}\n`);
  process.exitCode = 1;
}
