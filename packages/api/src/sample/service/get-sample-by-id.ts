import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { selectSample } from "./select-sample.ts";
import { toSample } from "./to-sample.ts";

export async function getSampleById(
  db: Transactional<DB>,
  id: string,
): Promise<Sample> {
  const row = await selectSample(db)
    .where("sample.id", "=", id)
    .executeTakeFirstOrThrow();
  return toSample(row, row.relations, row.attachments, row.manualGroups);
}
