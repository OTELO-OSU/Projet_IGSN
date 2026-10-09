import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

export const seriesIdOf = async (db: Kysely<DB>, id: string) =>
  (
    await db
      .selectFrom("sample_series_membership")
      .select("series_id")
      .where("sample_id", "=", id)
      .executeTakeFirst()
  )?.series_id ?? null;
