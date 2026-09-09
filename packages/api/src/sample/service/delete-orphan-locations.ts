import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function deleteOrphanLocations(
  db: Transactional<DB>,
  id?: string,
): Promise<void> {
  let query = db
    .deleteFrom("location")
    .where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("sample")
            .select("sample.id")
            .whereRef("sample.location_id", "=", "location.id"),
        ),
      ),
    );
  if (id !== undefined) {
    query = query.where("location.id", "=", id);
  }
  await query.execute();
}
