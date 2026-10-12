import { HTTPException } from "hono/http-exception";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { markForSynchronization } from "./mark-for-synchronization.ts";

export const CHILD_NOT_ELIGIBLE_MESSAGE = "Child sample not eligible";

export class ChildNotEligibleError extends HTTPException {
  constructor() {
    super(422, { message: CHILD_NOT_ELIGIBLE_MESSAGE });
  }
}

export async function replaceSampleChildren(
  db: Transactional<DB>,
  seriesId: string,
  childIds: string[],
): Promise<void> {
  const held = (
    await db
      .deleteFrom("sample_series_membership")
      .where("series_id", "=", seriesId)
      .returning("sample_id")
      .execute()
  ).map(({ sample_id }) => sample_id);
  if (childIds.length > 0) {
    const claimed = await db
      .insertInto("sample_series_membership")
      .values(childIds.map((id) => ({ sample_id: id, series_id: seriesId })))
      .onConflict((oc) => oc.column("sample_id").doNothing())
      .returning("sample_id")
      .execute();
    if (claimed.length < childIds.length) throw new ChildNotEligibleError();
  }
  await markForSynchronization(db, [
    ...held.filter((id) => !childIds.includes(id)),
    ...childIds.filter((id) => !held.includes(id)),
  ]);
}

export const catchChildNotEligible = <T>(
  write: Promise<T>,
): Promise<T | ChildNotEligibleError> =>
  write.catch((error: unknown) => {
    if (error instanceof ChildNotEligibleError) return error;
    throw error;
  });
