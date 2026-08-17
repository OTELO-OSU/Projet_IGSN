import { type Messages } from "@projet-igsn/domain/sample/create-sample-labels";
import { createUserStatusLabel } from "@projet-igsn/domain/user/user-status-labels";

import { m } from "#/paraglide/messages.js";

export const userStatusLabel = createUserStatusLabel(m as unknown as Messages);
