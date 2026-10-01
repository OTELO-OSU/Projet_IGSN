import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { selectSample } from "./select-sample.ts";
import { toSample } from "./to-sample.ts";

export async function listSamplesByInternalNumbers(
  db: Transactional<DB>,
  numbers: number[],
  userId: string,
): Promise<{ sample: Sample; role: UserSampleRole | null }[]> {
  if (numbers.length === 0) return [];
  const rows = await selectSample(db)
    .leftJoin("user_sample", (join) =>
      join
        .onRef("user_sample.sample_id", "=", "sample.id")
        .on("user_sample.user_id", "=", userId),
    )
    .select("user_sample.role")
    .where("sample.internal_number", "in", numbers)
    .execute();
  return rows.map((row) => ({ sample: toSample(row), role: row.role }));
}
