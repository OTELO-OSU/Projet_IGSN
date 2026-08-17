import type { SetInstitutionalGroups } from "../institutional-group/institutional-groups-validator.ts";
import type { User, UserStatus } from "./model.ts";
import type {
  ListUsersQuery,
  SetUserStatusBody,
  UserIdentity,
} from "./user-validator.ts";

// The token carries the whole user but not its local id, which the upsert
// resolves (or creates) by email. It never carries an ORCID, so `orcid` is
// excluded: the upsert must not clobber a stored one.
export type UpsertUser = Pick<User, "email" | "name" | "firstname">;

export type PendingUser = Pick<User, "email" | "name" | "firstname"> & {
  createdAt: Date;
};

export type UserRepository = {
  upsert(input: UpsertUser): Promise<User>;
  // `callerId` comes from the token, never from the client: nobody shares a
  // sample with themself, so the caller is always left out of the results.
  search(
    query: string | undefined,
    callerId: string,
    excludeCollaboratorsOf?: string,
    status?: UserStatus,
  ): Promise<UserIdentity[]>;
  // Resolves to null when another user already holds that ORCID.
  setOrcid(userId: string, orcid: string | null): Promise<User | null>;
  // ponytail: first set only, resolving to null when the caller already has groups; updating them is ticket 115
  setInstitutionalGroups(
    userId: string,
    groups: SetInstitutionalGroups,
  ): Promise<User | null>;
  findByOrcid(orcid: string): Promise<User | undefined>;
  // Moderation, super-admin only: the whole registry of accounts.
  list(query: ListUsersQuery): Promise<{ data: User[]; total: number }>;
  get(id: string): Promise<User | null>;
  listPending(): Promise<PendingUser[]>;
  listSuperAdminEmails(): Promise<string[]>;
  hasPublishedSample(userId: string): Promise<boolean>;
  setStatus(id: string, status: UserDecision): Promise<User | null>;
};

export type UserDecision = SetUserStatusBody["status"];
