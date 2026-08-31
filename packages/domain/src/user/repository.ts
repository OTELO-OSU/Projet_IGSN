import type { SetInstitutionalGroups } from "../institutional-group/institutional-groups-validator.ts";
import type { ManualGroup } from "../manual-group/model.ts";
import type { ManagedGroups } from "./managed-groups.ts";
import type { User, UserStatus } from "./model.ts";
import type { ModerationScope } from "./moderation-scope.ts";
import type { OrphanedGroup } from "./orphaned-group.ts";
import type {
  AdminUser,
  InstitutionalGroupCounts,
  ListedUser,
  ListUsersQuery,
  PublicUser,
  UpdateUser,
  UserIdentity,
} from "./user-validator.ts";

export type UpsertUser = Pick<User, "email" | "name" | "firstname">;

export type PendingUser = Pick<
  User,
  "email" | "name" | "firstname" | "institutionalLaboratory"
> & {
  createdAt: Date;
};

export type SpaceManager = {
  id: string;
  email: string;
  groups: ManagedGroups;
};

export type SearchUsersFilters = {
  search?: string;
  ids?: string[];
  excludeCollaboratorsOf?: string;
  status?: UserStatus;
  excludeMembersOf?: string;
  includeSelf?: boolean;
};

export type UserRepository = {
  upsert(input: UpsertUser): Promise<User>;
  search(
    callerId: string,
    filters: SearchUsersFilters,
  ): Promise<UserIdentity[]>;
  setOrcid(userId: string, orcid: string | null): Promise<User | null>;
  setInstitutionalGroups(
    userId: string,
    groups: SetInstitutionalGroups,
  ): Promise<{ orphanedGroups: OrphanedGroup[] }>;
  findByOrcid(orcid: string): Promise<User | undefined>;
  list(
    query: ListUsersQuery,
    scope: ModerationScope,
  ): Promise<{ data: ListedUser[]; total: number }>;
  get(id: string, scope: ModerationScope): Promise<AdminUser | null>;
  listPublicUsers(include?: string): Promise<PublicUser[]>;
  countByInstitutionalGroup(
    scope: ModerationScope,
  ): Promise<InstitutionalGroupCounts>;
  listPending(): Promise<PendingUser[]>;
  listSuperAdminEmails(): Promise<string[]>;
  listSpaceManagers(): Promise<SpaceManager[]>;
  update(
    id: string,
    user: UpdateUser,
    scope: ModerationScope,
  ): Promise<UpdateUserResult>;
  removeInstitutionalGroups(
    id: string,
    scope: ModerationScope,
  ): Promise<{
    previousStatus: UserStatus;
    status: UserStatus;
    orphanedGroups: OrphanedGroup[];
  }>;
  getModerationScope(userId: string): Promise<ManagedGroups>;
};

export type UpdateUserResult = {
  user: AdminUser;
  previousStatus: UserStatus;
  joinedGroups: ManualGroup[];
  leftGroupIds: string[];
  orphanedGroups: OrphanedGroup[];
};
