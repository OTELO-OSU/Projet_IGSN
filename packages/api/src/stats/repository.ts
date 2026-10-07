import type { StatsRepository } from "@projet-igsn/domain/stats/repository";

import { type Kysely, sql } from "kysely";

import type { DB } from "../db.ts";

export function createStatsRepository(db: Kysely<DB>): StatsRepository {
  return {
    count: () =>
      db
        .selectNoFrom((eb) => [
          eb
            .selectFrom("sample")
            .select(sql<number>`count(*)::int`.as("n"))
            .where("status", "not in", ["draft", "tombstone"])
            .as("samples"),
          eb
            .selectFrom("user")
            .select(sql<number>`count(*)::int`.as("n"))
            .where("status", "=", "accepted")
            .as("users"),
        ])
        .$castTo<{ samples: number; users: number }>()
        .executeTakeFirstOrThrow(),
  };
}
