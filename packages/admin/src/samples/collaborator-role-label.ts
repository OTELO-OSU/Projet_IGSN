import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { CollaboratorRole } from "@projet-igsn/domain/user-sample/user-sample-validator";

import { m } from "#/paraglide/messages.js";

const COLLABORATOR_ROLE_LABELS: Record<UserSampleRole, () => string> = {
  owner: m.share_owner_label,
  editor: m.share_role_editor,
  contributor: m.share_role_contributor,
};

const COLLABORATOR_ROLE_DESCRIPTIONS: Record<CollaboratorRole, () => string> = {
  editor: m.share_role_editor_description,
  contributor: m.share_role_contributor_description,
};

export function collaboratorRoleLabel(role: UserSampleRole): string {
  return COLLABORATOR_ROLE_LABELS[role]();
}

export function collaboratorRoleDescription(role: CollaboratorRole): string {
  return COLLABORATOR_ROLE_DESCRIPTIONS[role]();
}
