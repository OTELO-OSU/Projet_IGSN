import type { SeriesLinkCandidate } from "@projet-igsn/domain/sample/repository";
import type { User } from "@projet-igsn/domain/user/model";

import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";

import { effectiveRole } from "./require-sample-access.ts";

export function canEditCandidate(
  user: Pick<User, "superAdmin">,
  candidate: SeriesLinkCandidate,
) {
  return isSampleEditor(
    effectiveRole(user, candidate.role, candidate.moderated),
  );
}
