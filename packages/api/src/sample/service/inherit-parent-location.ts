import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function inheritParentLocation(
  db: Transactional<DB>,
  sampleId: string,
  parentId: string,
): Promise<void> {
  const parent = await db
    .selectFrom("sample")
    .select(["material", "location_id"])
    .where("id", "=", parentId)
    .executeTakeFirst();
  if (
    !parent ||
    parent.location_id === null ||
    !allowsLocation(parent.material)
  ) {
    return;
  }
  await db
    .updateTable("sample")
    .set({ location_id: parent.location_id })
    .where("id", "=", sampleId)
    .execute();
}
