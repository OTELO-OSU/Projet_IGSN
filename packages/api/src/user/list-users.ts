import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";
import type {
  ListedUser,
  ListUsersQuery,
} from "@projet-igsn/domain/user/user-validator";
import type { Transaction } from "kysely";

import { laboratoryCodesWithPredecessors } from "@projet-igsn/domain/institutional-group/laboratory-codes-with-predecessors";
import { osuIdOf } from "@projet-igsn/domain/institutional-group/osu-id-of";
import { listedUserSchema } from "@projet-igsn/domain/user/user-validator";

import type { DB } from "../db.ts";

import {
  institutionCodes,
  laboratoryIdsOf,
} from "../institutional-group/stored-institution.ts";
import { likePattern } from "../like-pattern.ts";
import { moderationScopeWhere } from "./moderation-scope-where.ts";
import { USER_COLUMNS, userManualGroups } from "./user-columns.ts";
import { userRoleWhere } from "./user-role-where.ts";

export async function listUsers(
  trx: Transaction<DB>,
  {
    page,
    perPage,
    status,
    search,
    institutionalOrganization,
    institutionalOsu,
    institutionalLaboratory,
    manualGroup,
    roles,
  }: ListUsersQuery,
  scope: ModerationScope,
): Promise<{ data: ListedUser[]; total: number }> {
  const matching = trx
    .selectFrom("user")
    .where((eb) =>
      eb.and({
        status,
        institutional_organization: institutionalOrganization,
        institutional_osu: institutionalOsu && osuIdOf(institutionalOsu),
      }),
    )
    .$if(institutionalLaboratory !== undefined, (qb) =>
      qb.where(
        "institutional_laboratory",
        "in",
        laboratoryIdsOf(
          laboratoryCodesWithPredecessors(institutionalLaboratory!),
        ),
      ),
    )
    .where((eb) => eb.and(moderationScopeWhere(eb, scope)))
    .$if(search !== undefined, (qb) =>
      qb.where((eb) =>
        eb.or(
          (["name", "firstname", "email"] as const).map((column) =>
            eb(column, "ilike", likePattern(search!)),
          ),
        ),
      ),
    )
    .$if(manualGroup !== undefined, (qb) =>
      qb.where((eb) =>
        eb.exists(
          eb
            .selectFrom("manual_group_member")
            .select("manual_group_member.user_id")
            .whereRef("manual_group_member.user_id", "=", "user.id")
            .where("manual_group_member.group_id", "=", manualGroup!),
        ),
      ),
    )
    .$if(roles !== undefined, (qb) =>
      qb.where((eb) => eb.or(roles!.map((role) => userRoleWhere(eb, role)))),
    );
  const rows = await matching
    .select(USER_COLUMNS)
    .select(userManualGroups)
    .orderBy("email", "asc")
    .limit(perPage)
    .offset((page - 1) * perPage)
    .execute();
  const { count } = await matching
    .select((eb) => eb.fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
  return {
    data: rows.map((row) => listedUserSchema.parse(institutionCodes(row))),
    total: Number(count),
  };
}
