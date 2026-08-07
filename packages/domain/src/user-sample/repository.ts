import type { SampleCollaborator } from "./user-sample-validator.ts";

export type UserSampleRepository = {
  addOwner(sampleId: string, userId: string): Promise<void>;
  addContributor(
    sampleId: string,
    userId: string,
  ): Promise<"added" | "unknown_user">;
  removeContributor(
    sampleId: string,
    userId: string,
  ): Promise<"removed" | "not_found">;
  listCollaborators(sampleId: string): Promise<SampleCollaborator[]>;
};
