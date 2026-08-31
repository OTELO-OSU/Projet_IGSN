import type { SampleStatus } from "../sample/sample.ts";
import type { User } from "../user/model.ts";
import type { UserSampleRole } from "./model.ts";

import { hasPermanentIgsn } from "../sample/publication/has-permanent-igsn.ts";
import { isSampleOwner } from "./is-sample-owner.ts";

export function canRequestSampleDeletion(
  role: UserSampleRole | null,
  sample: { status: SampleStatus },
  user: Pick<User, "superAdmin">,
): boolean {
  // A super admin is the recipient of the request, never its sender.
  return !user.superAdmin && isSampleOwner(role) && hasPermanentIgsn(sample);
}
