import { HTTPException } from "hono/http-exception";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

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
  await db
    .deleteFrom("sample_series_membership")
    .where("series_id", "=", seriesId)
    .execute();
  if (childIds.length === 0) return;
  const claimed = await db
    .insertInto("sample_series_membership")
    .values(childIds.map((id) => ({ sample_id: id, series_id: seriesId })))
    .onConflict((oc) => oc.column("sample_id").doNothing())
    .returning("sample_id")
    .execute();
  if (claimed.length < childIds.length) throw new ChildNotEligibleError();
}

export const catchChildNotEligible = <T>(
  write: Promise<T>,
): Promise<T | ChildNotEligibleError> =>
  write.catch((error: unknown) => {
    if (error instanceof ChildNotEligibleError) return error;
    throw error;
  });
