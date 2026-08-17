import type { SetInstitutionalGroups } from "../institutional-group/institutional-groups-validator.ts";
import type { User, UserStatus } from "./model.ts";
import type {
  ListUsersQuery,
  SetUserStatusBody,
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
  list(query: ListUsersQuery): Promise<{ data: User[]; total: number }>;
  get(id: string): Promise<User | null>;
  listPending(): Promise<PendingUser[]>;
  listSuperAdminEmails(): Promise<string[]>;
  hasPublishedSample(userId: string): Promise<boolean>;
  setStatus(id: string, status: UserDecision): Promise<User | null>;
};

export type UserDecision = SetUserStatusBody["status"];
