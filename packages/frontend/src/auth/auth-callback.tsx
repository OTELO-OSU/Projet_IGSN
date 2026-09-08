import { safeReturnPath } from "@projet-igsn/domain/auth/safe-return-path";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";

export function AuthCallback() {
  const auth = useAuth();

  if (auth.isLoading) {
    return null;
  }

  if (auth.error) {
    return <p role="alert">{m.auth_error({ message: auth.error.message })}</p>;
  }

  return (
    <Navigate to="/" href={safeReturnPath(auth.user?.url_state)} replace />
  );
}
