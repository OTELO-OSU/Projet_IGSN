import type { Location } from "@projet-igsn/domain/sample/location/model";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { deleteOrphanLocations } from "./delete-orphan-locations.ts";
import { hasLocationData, locationColumns } from "./to-location.ts";

function setLocationId(
  db: Transactional<DB>,
  sampleId: string,
  locationId: string | null,
) {
  return db
    .updateTable("sample")
    .set({ location_id: locationId })
    .where("id", "=", sampleId)
    .execute();
}

async function hasParent(db: Transactional<DB>, sampleId: string) {
  const parent = await db
    .selectFrom("sample_parent")
    .select("parent_id")
    .where("sample_id", "=", sampleId)
    .executeTakeFirst();
  return parent !== undefined;
}

export async function writeSampleLocation(
  db: Transactional<DB>,
  sampleId: string,
  location: Location | null | undefined,
): Promise<void> {
  const columns = locationColumns(location);
  const { location_id: locationId } = await db
    .selectFrom("sample")
    .select("location_id")
    .where("id", "=", sampleId)
    .executeTakeFirstOrThrow();

  // The location row belongs to the parent and every sibling reads it, so a child may only move its own pointer.
  if (await hasParent(db, sampleId)) {
    if (hasLocationData(columns) || locationId === null) return;
    await setLocationId(db, sampleId, null);
    return;
  }

  if (!hasLocationData(columns)) {
    if (locationId === null) return;
    await setLocationId(db, sampleId, null);
    await deleteOrphanLocations(db, locationId);
    return;
  }
  if (locationId !== null) {
    await db
      .updateTable("location")
      .set(columns)
      .where("id", "=", locationId)
      .execute();
    return;
  }
  const id = uuidv7();
  await db
    .insertInto("location")
    .values({ id, ...columns })
    .execute();
  await setLocationId(db, sampleId, id);
}
