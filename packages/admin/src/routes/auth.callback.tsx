import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";

import { safeReturnPath } from "../auth/sign-in.ts";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  return (
    <Navigate to="/" href={safeReturnPath(useAuth().user?.url_state)} replace />
  );
}
