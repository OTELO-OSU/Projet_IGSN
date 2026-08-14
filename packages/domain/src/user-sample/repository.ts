import type { User } from "../user/model.ts";
import type {
  CollaboratorRole,
  SampleCollaborator,
} from "./user-sample-validator.ts";

export type AddCollaboratorResult =
  | "unknown_user"
  | "already_collaborator"
  | "role_change_forbidden"
  | "user_not_invitable"
  | { added: Pick<User, "email" | "name" | "firstname"> };

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
};
