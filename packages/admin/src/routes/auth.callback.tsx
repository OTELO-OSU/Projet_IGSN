import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

// Where Keycloak returns after login (the only redirect URI GaiaData registers).
// The hop home MUST stay in the component: it mounts only once AuthGate lets
// children through, so react-oidc-context has already consumed ?code&state. A
// beforeLoad or router redirect would race the library and strip them first;
// a replaceState in onSigninCallback would leave the router matching a path
// it never observed changing.
function AuthCallbackPage() {
  return <Navigate to="/" replace />;
}
