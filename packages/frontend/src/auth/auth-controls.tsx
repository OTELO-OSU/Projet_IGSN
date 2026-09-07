import { Button } from "@projet-igsn/design-system/components/ui/button";
import { useAuth } from "react-oidc-context";

import { ADMIN_URL } from "#/admin-url.ts";
import { m } from "#/paraglide/messages.js";

import { signIn } from "./sign-in.ts";

export function AuthControls() {
  const auth = useAuth();

  if (auth.isLoading) {
    return null;
  }

  if (!auth.isAuthenticated) {
    return (
      <Button type="button" onClick={() => signIn(auth)}>
        {m.auth_sign_in()}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={ADMIN_URL}>{m.auth_go_to_admin()}</a>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void auth.signoutRedirect()}
      >
        {m.auth_sign_out()}
      </Button>
    </div>
  );
}
