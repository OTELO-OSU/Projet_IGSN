import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";
import type { Kysely } from "kysely";

import { manualGroupSchema } from "@projet-igsn/domain/manual-group/model";

import type { DB } from "../db.ts";

import { transactionally, withTransaction } from "../transaction.ts";
import { addManualGroupMember } from "./add-manual-group-member.ts";
import {
  attachableManualGroups,
  sampleOwnerId,
} from "./attachable-manual-groups.ts";
import { createManualGroup } from "./create-manual-group.ts";
import { detachManualGroupMember } from "./detach-manual-group-member.ts";
import { grantManualGroupManagers } from "./grant-manual-group-managers.ts";
import { listManualGroupManagers } from "./list-manual-group-managers.ts";
import { listManualGroupMembers } from "./list-manual-group-members.ts";
import { listManualGroupsWithPublishedSample } from "./list-manual-groups-with-published-sample.ts";
import { listManualGroupsWithoutActiveManager } from "./list-manual-groups-without-active-manager.ts";
import { listManualGroups } from "./list-manual-groups.ts";
import { listUserManualGroups } from "./list-user-manual-groups.ts";
import { GROUP_COLUMNS } from "./manual-group-columns.ts";
import { manualGroupsByIds } from "./manual-groups-by-ids.ts";
import { removeManualGroup } from "./remove-manual-group.ts";
import { renameManualGroup } from "./rename-manual-group.ts";
import { revokeManualGroupManager } from "./revoke-manual-group-manager.ts";

export function createManualGroupRepository(
  db: Kysely<DB>,
): ManualGroupRepository {
  const tx = transactionally(db);
  return {
    list: tx(listManualGroups),
    get: (id) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("manual_group")
          .select(GROUP_COLUMNS)
          .where("id", "=", id)
          .executeTakeFirst();
        return row ? manualGroupSchema.parse(row) : null;
      }),
    create: tx(createManualGroup),
    rename: tx(renameManualGroup),
    remove: tx(removeManualGroup),
    listMembers: tx(listManualGroupMembers),
    addMember: tx(addManualGroupMember),
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
    listManagers: tx(listManualGroupManagers),
    addManager: (groupId, userId) =>
      withTransaction(db, (trx) =>
        grantManualGroupManagers(trx, groupId, [userId]),
      ),
    removeManager: tx(revokeManualGroupManager),
    listWithoutActiveManager: tx(listManualGroupsWithoutActiveManager),
    listForUser: tx(listUserManualGroups),
    listAttachableForUser: (userId) =>
      withTransaction(db, (trx) => attachableManualGroups(trx, userId)),
    listByIds: (ids) =>
      ids.length === 0
        ? Promise.resolve([])
        : withTransaction(db, async (trx) => {
            const rows = await manualGroupsByIds(trx, ids);
            return rows.map((row) => manualGroupSchema.parse(row));
          }),
    listForSampleOwner: (sampleId) =>
      withTransaction(db, (trx) =>
        attachableManualGroups(trx, sampleOwnerId(trx, sampleId)),
      ),
    listWithPublishedSample: tx(listManualGroupsWithPublishedSample),
  };
}
