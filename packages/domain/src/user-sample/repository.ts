import type { Sample } from "../sample/sample.ts";
import type { User } from "../user/model.ts";
import type {
  CollaboratorRole,
  SampleCollaborator,
} from "./user-sample-validator.ts";

export type AddCollaboratorResult =
  | "already_collaborator"
  | { added: Pick<User, "email" | "name" | "firstname"> };

export type ContactSample = Pick<
  Sample,
  | "id"
  | "manualGroups"
  | "institutionalOrganization"
  | "institutionalOsu"
  | "institutionalLaboratory"
>;

export type UserSampleRepository = {
  addOwner(sampleId: string, userId: string): Promise<void>;
  addCollaborator(
    sampleId: string,
    userId: string,
    role: CollaboratorRole,
    options?: { mayChangeRole: boolean },
  ): Promise<AddCollaboratorResult>;
  removeCollaborator(
    sampleId: string,
    userId: string,
  ): Promise<"removed" | "not_found">;
  listCollaborators(sampleId: string): Promise<SampleCollaborator[]>;
  listContactRecipients(sample: ContactSample): Promise<string[]>;
};
