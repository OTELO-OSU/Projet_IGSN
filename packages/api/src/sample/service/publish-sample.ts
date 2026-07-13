import type { Sample } from "@projet-igsn/domain/sample/sample";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { getSampleAge } from "./get-sample-age.ts";
import { readLocation } from "./read-location.ts";
import { toSample } from "./to-sample.ts";

export async function publishSample(
  db: Transactional<DB>,
  id: string,
): Promise<Sample | null> {
  const row = await db
    .updateTable("sample")
    .set({ published: true, igsn: generateIgsnSuffix(id) })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
  if (!row) return null;
  const [location, age] = await Promise.all([
    readLocation(db, id),
    getSampleAge(db, id),
  ]);
  return toSample(row, location, age);
}
