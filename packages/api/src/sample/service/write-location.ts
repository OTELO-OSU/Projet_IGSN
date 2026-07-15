import type { Location } from "@projet-igsn/domain/sample/location/model";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { toLocationValues } from "./to-location.ts";

// Upsert the sample's location row, or delete it when the sample has none.
// The 1:1 row is keyed by sample_id, so a conflict updates in place.
export async function writeLocation(
  db: Transactional<DB>,
  sampleId: string,
  location: Location | null | undefined,
): Promise<void> {
  if (location == null) {
    await db.deleteFrom("location").where("sample_id", "=", sampleId).execute();
    return;
  }
  const values = toLocationValues(sampleId, location);
  await db
    .insertInto("location")
    .values(values)
    .onConflict((oc) => oc.column("sample_id").doUpdateSet(values))
    .execute();
}
