import { Button } from "@projet-igsn/design-system/components/ui/button";
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">IGSN Admin</h1>
          <p className="text-muted-foreground">
            Welcome. Please sign in to manage IGSN records.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={() => void auth.signinRedirect()}
        >
          Sign in with Keycloak
        </Button>
      </main>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => void auth.signoutRedirect()}
      >
        Sign out
      </Button>
      <App />
    </>
  );
}
