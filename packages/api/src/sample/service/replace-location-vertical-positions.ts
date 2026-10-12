import type { VerticalPosition } from "@projet-igsn/domain/sample/location/model";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function replaceLocationVerticalPositions(
  db: Transactional<DB>,
  locationId: string,
  rows: readonly VerticalPosition[],
): Promise<void> {
  await db
    .deleteFrom("location_vertical_position")
    .where("location_id", "=", locationId)
    .execute();
  if (rows.length === 0) return;
  await db
    .insertInto("location_vertical_position")
    .values(
      rows.map(({ reference, system, start, end }) => ({
        id: uuidv7(),
        location_id: locationId,
        reference: reference ?? null,
        system: system ?? null,
        start_value: start ?? null,
        end_value: end ?? null,
      })),
    )
    .execute();
}
