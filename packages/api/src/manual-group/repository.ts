import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { Kysely } from "kysely";

import {
  manualGroupListItemSchema,
  manualGroupMemberSchema,
  myManualGroupSchema,
} from "@projet-igsn/domain/manual-group/manual-group-validator";
import { manualGroupSchema } from "@projet-igsn/domain/manual-group/model";
import { sql } from "kysely";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { type Transactional, withTransaction } from "../transaction.ts";
import { addManualGroupMember } from "./add-manual-group-member.ts";
import { detachManualGroupMember } from "./detach-manual-group-member.ts";
import { manualGroupsByIds } from "./manual-groups-by-ids.ts";
import { ownsPublishedSampleInGroup } from "./owns-published-sample-in-group.ts";

const GROUP_COLUMNS = ["id", "name"] as const;

const publishedSampleGroups = (trx: Transactional<DB>) =>
  trx
    .selectFrom("sample_manual_group")
    .innerJoin("sample", "sample.id", "sample_manual_group.sample_id")
    .where("sample.published", "=", true);

// ponytail: name-keyed advisory lock rather than catching the unique violation, which would poison a reused transaction (no savepoints).
const lockName = (trx: Transactional<DB>, name: string) =>
  sql`select pg_advisory_xact_lock(hashtext(${name.toLowerCase()}))`.execute(
    trx,
  );

export function createManualGroupRepository(
  db: Kysely<DB>,
): ManualGroupRepository {
  return {
    list: ({ page, perPage, search }, managedGroupIds) =>
      withTransaction(db, async (trx) => {
        const matching = trx
          .selectFrom("manual_group")
          .$if(managedGroupIds !== null, (qb) =>
            managedGroupIds!.length > 0
              ? qb.where("id", "in", managedGroupIds!)
              : qb.where((eb) => eb.lit(false)),
          )
          .$if(Boolean(search), (qb) =>
            qb.where(
              "name",
              "ilike",
              `%${search!.replace(/[\\%_]/g, "\\$&")}%`,
            ),
          );
        const rows = await matching
          .select((eb) => [
            ...GROUP_COLUMNS,
            eb
              .selectFrom("manual_group_member")
              .whereRef("manual_group_member.group_id", "=", "manual_group.id")
              .select((count) => count.fn.countAll().as("count"))
              .as("memberCount"),
          ])
          .orderBy("name", "asc")
          .limit(perPage)
          .offset((page - 1) * perPage)
          .execute();
        const { count } = await matching
          .select((eb) => eb.fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow();
        return {
          data: rows.map((row) =>
            manualGroupListItemSchema.parse({
              ...row,
              memberCount: Number(row.memberCount),
            }),
          ),
          total: Number(count),
        };
      }),
    get: (id) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("manual_group")
          .select(GROUP_COLUMNS)
          .where("id", "=", id)
          .executeTakeFirst();
        return row ? manualGroupSchema.parse(row) : null;
      }),
    create: (name) =>
      withTransaction(db, async (trx) => {
        await lockName(trx, name);
        const row = await trx
          .insertInto("manual_group")
          .values({ id: uuidv7(), name })
          .onConflict((oc) => oc.doNothing())
          .returning(GROUP_COLUMNS)
          .executeTakeFirst();
        return row ? { group: manualGroupSchema.parse(row) } : "name_taken";
      }),
    rename: (id, name) =>
      withTransaction(db, async (trx) => {
        await lockName(trx, name);
        const taken = await trx
          .selectFrom("manual_group")
          .select("id")
          .where(sql`lower(name)`, "=", name.toLowerCase())
          .where("id", "<>", id)
          .executeTakeFirst();
        if (taken) {
          return "name_taken";
        }
        const row = await trx
          .updateTable("manual_group")
          .set({ name })
          .where("id", "=", id)
          .returning(GROUP_COLUMNS)
          .executeTakeFirst();
        return row ? { group: manualGroupSchema.parse(row) } : "not_found";
      }),
    remove: (id) =>
      withTransaction(db, async (trx) => {
        const published = await publishedSampleGroups(trx)
          .select("sample.id")
          .where("sample_manual_group.group_id", "=", id)
          .limit(1)
          .executeTakeFirst();
        if (published) {
          return "has_published_sample";
        }
        const { numDeletedRows } = await trx
          .deleteFrom("manual_group")
          .where("id", "=", id)
          .executeTakeFirst();
        return numDeletedRows > 0n ? "removed" : "not_found";
      }),
    listMembers: (id) =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("manual_group_member")
          .innerJoin("user", "user.id", "manual_group_member.user_id")
          .select([
            "user.id",
            "user.email",
            "user.name",
            "user.firstname",
            "user.orcid",
            "user.status",
          ])
          .where("manual_group_member.group_id", "=", id)
          .orderBy("user.email", "asc")
          .execute();
        return rows.map((row) => manualGroupMemberSchema.parse(row));
      }),
    addMember: (groupId, userId) =>
      withTransaction(db, (trx) => addManualGroupMember(trx, groupId, userId)),
    removeMember: (groupId, userId) =>
      withTransaction(db, async (trx) => {
        const detached = await detachManualGroupMember(trx, groupId, userId);
        return detached === "detached"
          ? "removed"
          : detached === "not_member"
            ? "not_found"
            : detached;
      }),
    leave: (groupId, userId) =>
      withTransaction(db, async (trx) => {
        const detached = await detachManualGroupMember(trx, groupId, userId);
        return detached === "detached" ? "left" : detached;
      }),
    listForUser: (userId) =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("manual_group")
          .innerJoin(
            "manual_group_member",
            "manual_group_member.group_id",
            "manual_group.id",
          )
          .select((eb) => [
            "manual_group.id",
            "manual_group.name",
            eb
              .not(
                ownsPublishedSampleInGroup(userId, eb.ref("manual_group.id")),
              )
              .as("canLeave"),
          ])
          .where("manual_group_member.user_id", "=", userId)
          .orderBy("manual_group.name", "asc")
          .execute();
        return rows.map((row) => myManualGroupSchema.parse(row));
      }),
    listByIds: (ids) =>
      ids.length === 0
        ? Promise.resolve([])
        : withTransaction(db, async (trx) => {
            const rows = await manualGroupsByIds(trx, ids);
            return rows.map((row) => manualGroupSchema.parse(row));
          }),
    listForSampleOwner: (sampleId) =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("manual_group")
          .innerJoin(
            "manual_group_member",
            "manual_group_member.group_id",
            "manual_group.id",
          )
          .select(["manual_group.id", "manual_group.name"])
          .where((eb) =>
            eb.exists(
              eb
                .selectFrom("user_sample")
                .select("user_sample.user_id")
                .whereRef(
                  "user_sample.user_id",
                  "=",
                  "manual_group_member.user_id",
                )
                .where("user_sample.sample_id", "=", sampleId)
                .where("user_sample.role", "=", "owner"),
            ),
          )
          .orderBy("manual_group.name", "asc")
          .execute();
        return rows.map((row) => manualGroupSchema.parse(row));
      }),
    listWithPublishedSample: () =>
      withTransaction(db, async (trx) => {
        const rows = await trx
          .selectFrom("manual_group")
          .select(GROUP_COLUMNS)
          .where(
            "id",
            "in",
            publishedSampleGroups(trx).select("sample_manual_group.group_id"),
          )
          .orderBy("name", "asc")
          .execute();
        return rows.map((row) => manualGroupSchema.parse(row));
      }),
  };
}
