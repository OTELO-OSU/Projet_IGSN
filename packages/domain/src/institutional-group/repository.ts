import type {
  GroupManager,
  InstitutionalGroupCounts,
} from "../user/user-validator.ts";
import type { InstitutionalGroupRef } from "./model.ts";

export type InstitutionalGroupRepository = {
  listManagers(ref: InstitutionalGroupRef): Promise<GroupManager[]>;
  addManager(ref: InstitutionalGroupRef, userId: string): Promise<void>;
  removeManager(ref: InstitutionalGroupRef, userId: string): Promise<void>;
  countActiveManagers(): Promise<InstitutionalGroupCounts>;
  listWithoutActiveManager(): Promise<InstitutionalGroupRef[]>;
};
