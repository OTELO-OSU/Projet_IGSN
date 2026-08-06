import type Catalog from "../../messages/en.json";
import type { Messages } from "../sample/create-sample-labels.ts";
import type { UserStatus } from "./model.ts";

import { vocabularyLabel } from "../sample/path/vocabulary-label.ts";

// Compile-time coverage: a status whose translation is missing from the shared
// catalog fails to compile here rather than rendering a raw key.
type AssertKeys<T extends keyof typeof Catalog> = T;
type _userStatusKeys = AssertKeys<`user_status_${UserStatus}`>;

// The resolving logic lives here; each app binds its own paraglide catalog
// (i18n rule), like createSampleLabels.
export function createUserStatusLabel(
  m: Messages,
): (status: UserStatus) => string {
  return vocabularyLabel<UserStatus>((status) => `user_status_${status}`, m);
}
