import { Button } from "@projet-igsn/design-system/components/ui/button";
import { signIn } from "@projet-igsn/domain/auth/sign-in";
import {
  broadcastSignOut,
  isSignOutBroadcast,
} from "@projet-igsn/domain/auth/sign-out-broadcast";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

import { ADMIN_URL } from "#/admin-url.ts";
import { m } from "#/paraglide/messages.js";

export function AuthControls() {
  const auth = useAuth();

  useEffect(() => {
    const followOtherTab = (event: StorageEvent) => {
      if (isSignOutBroadcast(event)) {
        void auth.removeUser();
      }
    };
    window.addEventListener("storage", followOtherTab);
    return () => window.removeEventListener("storage", followOtherTab);
  }, [auth]);

  if (auth.isAuthenticated) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="secondary" size="md">
          <a href={ADMIN_URL}>{m.auth_go_to_admin()}</a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => {
            broadcastSignOut(localStorage);
            void auth.signoutRedirect();
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
      variant="primary"
      size="md"
      disabled={Boolean(auth.activeNavigator)}
      onClick={() => signIn(auth)}
    >
      {m.auth_sign_in()}
    </Button>
  );
}
