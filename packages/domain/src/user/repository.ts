import type { User } from "./model.ts";
import type {
  ListUsersQuery,
  SetUserStatusBody,
  UserIdentity,
} from "./user-validator.ts";

// The token carries the whole user but not its local id, which the upsert
// resolves (or creates) by email. It never carries an ORCID, so `orcid` is
// excluded: the upsert must not clobber a stored one. Moderation state
// (status, superAdmin) is server-owned, never token-derived, so it is not
// part of the input either.
export type UpsertUser = Omit<User, "id" | "orcid" | "status" | "superAdmin">;

export type PendingUser = Pick<User, "email" | "name" | "firstname"> & {
  createdAt: Date;
};

export type UserRepository = {
  upsert(input: UpsertUser): Promise<User>;
  // No query browses everyone. `callerId` comes from the token, never from
  // the client: nobody shares a sample with themself, so the caller is
  // always left out of the results.
  search(
    query: string | undefined,
    callerId: string,
    excludeCollaboratorsOf?: string,
  ): Promise<UserIdentity[]>;
  // Resolves to null when another user already holds that ORCID.
  setOrcid(userId: string, orcid: string | null): Promise<User | null>;
  findByOrcid(orcid: string): Promise<User | undefined>;
  // Moderation, super-admin only: the whole registry of accounts, filtered and
  // paginated server-side.
  list(query: ListUsersQuery): Promise<{ data: User[]; total: number }>;
  get(id: string): Promise<User | null>;
  listPending(): Promise<PendingUser[]>;
  listSuperAdminEmails(): Promise<string[]>;
  setStatus(id: string, status: UserDecision): Promise<User | null>;
};

export type UserDecision = SetUserStatusBody["status"];
