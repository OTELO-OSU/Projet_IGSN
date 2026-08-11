import type { UserSampleRole } from "./model.ts";
import type { CollaboratorRole } from "./user-sample-validator.ts";

import { isSampleEditor } from "./is-sample-editor.ts";

export function canGrantRole(
  role: UserSampleRole | null,
  granted: CollaboratorRole,
): boolean {
  return (
    isSampleEditor(role) ||
    (role === "contributor" && granted === "contributor")
  );
}
