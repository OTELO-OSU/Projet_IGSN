import type { SearchUsersFilters } from "@projet-igsn/domain/user/repository";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { sql, type SqlBool } from "kysely";

import type { DB } from "../db.ts";

import { likePattern } from "../like-pattern.ts";
import { type Transactional } from "../transaction.ts";
import { unaccented } from "../unaccented.ts";

const SEARCHED_COLUMNS = ["name", "firstname", "email"] as const;

const SEARCH_LIMIT = 10;
const BROWSE_LIMIT = 20;

export function searchUsers(
  db: Transactional<DB>,
  callerId: string,
  {
    search,
    ids,
    excludeCollaboratorsOf,
    status,
    excludeMembersOf,
    includeSelf,
  }: SearchUsersFilters,
): Promise<UserIdentity[]> {
  const others = db
    .selectFrom("user")
    .select(["id", "email", "name", "firstname", "orcid"])
    .$if(ids === undefined && !includeSelf, (qb) =>
      qb.where("id", "!=", callerId),
    )
    .$if(ids === undefined, (qb) => qb.where("status", "!=", "rejected"))
    .$if(ids !== undefined, (qb) => qb.where("id", "in", ids!))
    .$if(status !== undefined, (qb) => qb.where("status", "=", status!))
    .$if(excludeCollaboratorsOf !== undefined, (qb) =>
      qb.where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom("user_sample")
              .select("user_sample.user_id")
              .whereRef("user_sample.user_id", "=", "user.id")
              .where("user_sample.sample_id", "=", excludeCollaboratorsOf!)
              .where((web) =>
                web.exists(
                  web
                    .selectFrom("user_sample as caller")
                    .select("caller.user_id")
                    .where("caller.sample_id", "=", excludeCollaboratorsOf!)
                    .where("caller.user_id", "=", callerId),
                ),
              ),
          ),
        ),
      ),
    )
    .$if(excludeMembersOf !== undefined, (qb) =>
      qb.where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom("manual_group_member")
              .select("manual_group_member.user_id")
              .whereRef("manual_group_member.user_id", "=", "user.id")
              .where("manual_group_member.group_id", "=", excludeMembersOf!),
          ),
        ),
      ),
    );
  if (search === undefined) {
    return others.orderBy("email").limit(BROWSE_LIMIT).execute();
  }
  const pattern = likePattern(search);
  return others
    .where((eb) =>
      eb.or(
        SEARCHED_COLUMNS.map(
          (column) =>
            sql<SqlBool>`${unaccented(column)} ilike immutable_unaccent(${pattern})`,
        ),
      ),
    )
    .orderBy("name")
    .limit(SEARCH_LIMIT)
    .execute();
}
