import { type Messages } from "@projet-igsn/domain/sample/create-sample-labels";
import { createUserStatusLabel } from "@projet-igsn/domain/user/user-status-labels";

import { m } from "#/paraglide/messages.js";

// The domain resolver bound to this app's paraglide catalog.
export const userStatusLabel = createUserStatusLabel(m as unknown as Messages);
