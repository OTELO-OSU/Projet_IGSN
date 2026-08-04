import type { UserSampleRole } from "./model.ts";

export function canUpdateSample(
  role: UserSampleRole | null,
  sample: { published: boolean },
): boolean {
  return role === "owner" || (role === "contributor" && !sample.published);
}
