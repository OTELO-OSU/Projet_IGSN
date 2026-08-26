import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type { InstitutionalGroupCounts } from "@projet-igsn/domain/user/user-validator";

import { sql } from "kysely";

import type { DB } from "../db.ts";

import { type Transactional, withTransaction } from "../transaction.ts";
import { moderationScopeWhere } from "./moderation-scope-where.ts";

export function countUsersByInstitutionalGroup(
  db: Transactional<DB>,
  scope: ModerationScope,
): Promise<InstitutionalGroupCounts> {
  return withTransaction(db, async (trx) => {
    const rows = await trx
      .selectFrom("user")
      .select((eb) => [
        "institutional_organization as organization",
        "institutional_osu as osu",
        "institutional_laboratory as laboratory",
        eb.fn.countAll<number>().as("count"),
      ])
      .where((eb) => eb.and(moderationScopeWhere(eb, scope)))
      .groupBy(
        sql`grouping sets ((institutional_organization), (institutional_osu), (institutional_laboratory))`,
      )
      .execute();

    const counts: InstitutionalGroupCounts = {
      organizations: {},
      osus: {},
      laboratories: {},
    };
    for (const { organization, osu, laboratory, count } of rows) {
      if (organization !== null) {
        counts.organizations[organization] = Number(count);
      } else if (osu !== null) {
        counts.osus[osu] = Number(count);
      } else if (laboratory !== null) {
        counts.laboratories[laboratory] = Number(count);
      }
    }
    return counts;
  });
}
