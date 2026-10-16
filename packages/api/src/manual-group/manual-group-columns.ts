import type { ExpressionBuilder } from "kysely";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";

export const GROUP_COLUMNS = ["id", "name"] as const;

export const hasActiveManager = (eb: ExpressionBuilder<DB, "manual_group">) =>
  eb.exists(
    eb
      .selectFrom("user_managed_manual_group")
      .innerJoin("user", "user.id", "user_managed_manual_group.user_id")
      .select("user.id")
      .whereRef("user_managed_manual_group.group_id", "=", "manual_group.id")
      .where("user.status", "=", "accepted"),
  );

export const sampleGroups = (trx: Transactional<DB>) =>
  trx
    .selectFrom("sample_manual_group")
    .innerJoin("sample", "sample.id", "sample_manual_group.sample_id");
