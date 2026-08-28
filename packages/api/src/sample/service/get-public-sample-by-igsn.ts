import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { sampleOwnerQuery } from "./sample-children-query.ts";
import { selectSample } from "./select-sample.ts";
import { toSample } from "./to-sample.ts";

export async function getPublicSampleByIgsn(
  db: Transactional<DB>,
  igsn: string,
): Promise<Sample | null> {
  const row = await selectSample(db)
    .select(sampleOwnerQuery)
    .where("igsn", "=", igsn)
    .where("status", "in", ["published", "withdrawn"])
    .executeTakeFirst();
  if (!row) return null;
  return {
    ...toSample(row, row.links, row.attachments, row.manualGroups),
    owner: row.owner && {
      name: row.owner.name,
      firstname: row.owner.firstname,
    },
  };
}
