import type { User } from "../user/model.ts";
import type {
  ListManualGroupsQuery,
  ManualGroupListItem,
  ManualGroupMember,
} from "./manual-group-validator.ts";
import type { ManualGroup } from "./model.ts";

// Only an accepted account may be associated, so a pending or rejected one
// comes back as `user_not_invitable`.
export type AddManualGroupMemberResult =
  | "unknown_user"
  | "user_not_invitable"
  | "already_member"
  | { added: Pick<User, "email" | "name" | "firstname"> };

export type CreateManualGroupResult = "name_taken" | { group: ManualGroup };

export type RenameManualGroupResult =
  | "name_taken"
  | "not_found"
  | { group: ManualGroup };

export type ManualGroupRepository = {
  list(
    query: ListManualGroupsQuery,
  ): Promise<{ data: ManualGroupListItem[]; total: number }>;
  get(id: string): Promise<ManualGroup | null>;
  create(name: string): Promise<CreateManualGroupResult>;
  rename(id: string, name: string): Promise<RenameManualGroupResult>;
  remove(id: string): Promise<"removed" | "not_found">;
  listMembers(id: string): Promise<ManualGroupMember[]>;
  addMember(
    groupId: string,
    userId: string,
  ): Promise<AddManualGroupMemberResult>;
  removeMember(
    groupId: string,
    userId: string,
  ): Promise<"removed" | "not_found">;
  listForUser(userId: string): Promise<ManualGroup[]>;
};
