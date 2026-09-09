import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { deleteOrphanLocations } from "./delete-orphan-locations.ts";

export async function deleteSample(
  db: Transactional<DB>,
  id: string,
): Promise<void> {
  const row = await db
    .deleteFrom("sample")
    .where("id", "=", id)
    .returning("location_id")
    .executeTakeFirst();
  if (row?.location_id != null) {
    await deleteOrphanLocations(db, row.location_id);
  }
}
