import { useAuth } from "react-oidc-context";

import App from "./app.tsx";

// Login page + gate: unauthenticated users see the sign-in screen, which
// redirects to Keycloak's hosted login (PKCE). Authenticated users see the app.
export function AuthGate() {
  const auth = useAuth();

  if (auth.isLoading) return <p>Loading…</p>;
  if (auth.error) return <p>Authentication error: {auth.error.message}</p>;

  if (!auth.isAuthenticated) {
    return (
      <main>
        <h1>IGSN Admin</h1>
        <button type="button" onClick={() => void auth.signinRedirect()}>
          Sign in with Keycloak
        </button>
      </main>
    );
  }

  return (
    <>
      <button type="button" onClick={() => void auth.signoutRedirect()}>
        Sign out
      </button>
      <App />
    </>
  );
}
