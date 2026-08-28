import type { User } from "./model.ts";

export function canEditFrozenSampleFields(
  user: Pick<User, "superAdmin">,
): boolean {
  return user.superAdmin;
}
