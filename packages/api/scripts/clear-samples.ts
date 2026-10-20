import type { Kysely } from "kysely";

import { sql } from "kysely";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { DB } from "../src/db.ts";

import { attachmentsDir } from "../src/attachments-dir.ts";
import { createDb } from "../src/db.ts";
import { deleteOrphanLocations } from "../src/sample/service/delete-orphan-locations.ts";
import { attachmentDirOf } from "../src/sample/service/insert-sample-attachment.ts";
import { withTransaction } from "../src/transaction.ts";

const PRODUCTION_DATACITE_HOST = "https://api.datacite.org";

export function clearSamplesRefusal(
  argv: string[],
  dataciteHost: string | undefined,
): string | undefined {
  if (!argv.includes("--yes")) {
    return "refusing to delete every sample without --yes";
  }
  if (dataciteHost?.replace(/\/+$/, "") === PRODUCTION_DATACITE_HOST) {
    return `refusing to delete every sample against the production DataCite host ${PRODUCTION_DATACITE_HOST}`;
  }
  return undefined;
}

export async function clearSamples(
  db: Kysely<DB>,
  storageDir: string,
): Promise<number> {
  const deleted = await withTransaction(db, async (trx) => {
    const rows = await trx.deleteFrom("sample").returning("id").execute();
    await deleteOrphanLocations(trx);
    await trx.deleteFrom("sample_batch_webhook").execute();
    await sql`alter sequence sample_internal_number_seq restart with 1`.execute(
      trx,
    );
    return rows;
  });
  await Promise.all(
    deleted.map(({ id }) =>
      rm(attachmentDirOf(storageDir, id), { recursive: true, force: true }),
    ),
  );
  return deleted.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const refusal = clearSamplesRefusal(
    process.argv.slice(2),
    process.env.DATACITE_API_HOST,
  );
  if (refusal) {
    console.error(refusal);
    process.exit(1);
  }
  const db = createDb();
  const count = await clearSamples(db, attachmentsDir);
  await db.destroy();
  console.info(`removed ${count} samples`);
}
