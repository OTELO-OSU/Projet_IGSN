import { Button } from "@projet-igsn/design-system/components/ui/button";
import { NAV_LINK_CLASS } from "@projet-igsn/design-system/lib/nav-link-class";
import { signIn } from "@projet-igsn/domain/auth/sign-in";
import {
  broadcastSignOut,
  onSignOutBroadcast,
} from "@projet-igsn/domain/auth/sign-out-broadcast";
import { markSignedOut } from "@projet-igsn/domain/auth/signed-out";
import { UserIcon } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

import { ADMIN_URL } from "#/admin-url.ts";
import { m } from "#/paraglide/messages.js";

export function AuthControls() {
  const auth = useAuth();

  useEffect(() => onSignOutBroadcast(() => void auth.removeUser()), [auth]);

  if (auth.isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-6">
        <a href={ADMIN_URL} className={NAV_LINK_CLASS}>
          {m.auth_go_to_dashboard()}
        </a>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            markSignedOut();
            broadcastSignOut();
            void auth.signoutRedirect({
              state: window.location.pathname + window.location.search,
            });
          }}
        >
          {m.auth_sign_out()}
        </Button>
      </div>
    );
  }

  if (auth.isLoading && !auth.activeNavigator) {
    return null;
  }

  return (
    <Button
      type="button"
      disabled={Boolean(auth.activeNavigator)}
      onClick={() => signIn(auth)}
    >
      <UserIcon aria-hidden />
      {m.auth_sign_in()}
    </Button>
  );
}
