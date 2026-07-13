import type { Sample } from "@projet-igsn/domain/sample/sample";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleAge } from "./get-sample-age.ts";
import { readLocation } from "./read-location.ts";
import { toSample } from "./to-sample.ts";

export async function getSample(
  db: Transactional<DB>,
  id: string,
): Promise<Sample | null> {
  const [row, location, age] = await Promise.all([
    db.selectFrom("sample").selectAll().where("id", "=", id).executeTakeFirst(),
    readLocation(db, id),
    getSampleAge(db, id),
  ]);
  return row ? toSample(row, location, age) : null;
}
