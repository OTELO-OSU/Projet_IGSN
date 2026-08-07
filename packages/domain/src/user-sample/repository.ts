import type { User } from "../user/model.ts";
import type { SampleCollaborator } from "./user-sample-validator.ts";

export type AddContributorResult =
  | "unknown_user"
  | "already_contributor"
  | { added: Pick<User, "email" | "name" | "firstname"> };

export type UserSampleRepository = {
  addOwner(sampleId: string, userId: string): Promise<void>;
  addContributor(
    sampleId: string,
    userId: string,
  ): Promise<AddContributorResult>;
  listCollaborators(sampleId: string): Promise<SampleCollaborator[]>;
};
