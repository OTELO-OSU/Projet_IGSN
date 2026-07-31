import type { User } from "../user/model.ts";

export type UserSampleRepository = {
  addOwner(sampleId: string, userId: string): Promise<void>;
  addContributor(
    sampleId: string,
    userId: string,
  ): Promise<"added" | "unknown_user">;
  listContributors(sampleId: string): Promise<User[]>;
};
