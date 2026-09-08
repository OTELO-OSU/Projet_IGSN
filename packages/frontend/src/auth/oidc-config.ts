import { oidcSettings } from "@projet-igsn/domain/auth/oidc-settings";
import { UserManager } from "oidc-client-ts";

import { ADMIN_URL } from "#/admin-url.ts";

export { onSigninCallback } from "@projet-igsn/domain/auth/oidc-settings";

export const userManager = new UserManager(
  oidcSettings({
    authority: import.meta.env.VITE_OIDC_AUTHORITY,
    clientId: import.meta.env.VITE_OIDC_CLIENT_ID,
    callbackUrl: `${ADMIN_URL}/auth/callback`,
  }),
);
