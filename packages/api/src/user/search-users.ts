import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import type { DB } from "../db.ts";

import { type Transactional } from "../transaction.ts";
const SEARCH_LIMIT = 10;
const BROWSE_LIMIT = 20;

export function searchUsers(
  db: Transactional<DB>,
  query: string | undefined,
  callerId: string,
  excludeCollaboratorsOf?: string,
  status?: UserStatus,
): Promise<UserIdentity[]> {
  const others = db
    .selectFrom("user")
    .select(["id", "email", "name", "firstname", "orcid"])
    .where("id", "!=", callerId)
    .where("status", "!=", "rejected")
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
    );
  if (query === undefined) {
    return others.orderBy("email").limit(BROWSE_LIMIT).execute();
  }
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  return others
    .where((eb) =>
      eb.or([eb("name", "ilike", pattern), eb("email", "ilike", pattern)]),
    )
    .orderBy("name")
    .limit(SEARCH_LIMIT)
    .execute();
}
