import { safeReturnPath } from "@projet-igsn/domain/auth/safe-return-path";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  return (
    <Navigate
      to="/"
      href={safeReturnPath(useAuth().user?.url_state, import.meta.env.BASE_URL)}
      replace
    />
  );
}
