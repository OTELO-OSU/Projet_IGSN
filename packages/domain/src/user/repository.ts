import type { SetInstitutionalGroups } from "../institutional-group/institutional-groups-validator.ts";
import type { ManualGroup } from "../manual-group/model.ts";
import type { ManagedGroups } from "./managed-groups.ts";
import type { User, UserStatus } from "./model.ts";
import type { ModerationScope } from "./moderation-scope.ts";
import type {
  AdminUser,
  ListedUser,
  ListUsersQuery,
  UpdateUser,
  UserIdentity,
} from "./user-validator.ts";

export type UpsertUser = Pick<User, "email" | "name" | "firstname">;

export type PendingUser = Pick<User, "email" | "name" | "firstname"> & {
  createdAt: Date;
};

export type UserRepository = {
  upsert(input: UpsertUser): Promise<User>;
  search(
    query: string | undefined,
    callerId: string,
    excludeCollaboratorsOf?: string,
    status?: UserStatus,
  ): Promise<UserIdentity[]>;
  setOrcid(userId: string, orcid: string | null): Promise<User | null>;
  setInstitutionalGroups(
    userId: string,
    groups: SetInstitutionalGroups,
  ): Promise<void>;
  findByOrcid(orcid: string): Promise<User | undefined>;
  list(
    query: ListUsersQuery,
    scope: ModerationScope,
  ): Promise<{ data: ListedUser[]; total: number }>;
  get(id: string, scope: ModerationScope): Promise<AdminUser | null>;
  listPending(): Promise<PendingUser[]>;
  listSuperAdminEmails(): Promise<string[]>;
  update(
    id: string,
    user: UpdateUser,
    scope: ModerationScope,
  ): Promise<UpdateUserResult>;
  getModerationScope(userId: string): Promise<ManagedGroups>;
};

export type UpdateUserResult = {
  user: AdminUser;
  previousStatus: UserStatus;
  joinedGroups: ManualGroup[];
  leftGroupIds: string[];
};
