import type Catalog from "../../messages/en.json";
import type { Messages } from "../sample/create-sample-labels.ts";
import type { UserStatus } from "./model.ts";

import { vocabularyLabel } from "../sample/path/vocabulary-label.ts";

type AssertKeys<T extends keyof typeof Catalog> = T;
type _userStatusKeys = AssertKeys<`user_status_${UserStatus}`>;

export function createUserStatusLabel(
  m: Messages,
): (status: UserStatus) => string {
  return vocabularyLabel<UserStatus>((status) => `user_status_${status}`, m);
}
