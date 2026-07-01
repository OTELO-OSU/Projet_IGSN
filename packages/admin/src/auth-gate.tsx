import { Button } from "@projet-igsn/design-system/components/ui/button";
import { useAuth } from "react-oidc-context";

import App from "./app.tsx";

// Login page + gate: unauthenticated users pick an identity provider, which
// redirects through Keycloak (kc_idp_hint) straight to that IdP. Accounts are
// provisioned on first login (first-broker-login). Authenticated users see the app.
const signInWith = (auth: ReturnType<typeof useAuth>, idp: string) => () =>
  void auth.signinRedirect({ extraQueryParams: { kc_idp_hint: idp } });

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
            Welcome. Sign in to manage IGSN records.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            size="lg"
            onClick={signInWith(auth, "shibboleth")}
          >
            Sign in with your institution
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={signInWith(auth, "orcid")}
          >
            Sign in with ORCID
          </Button>
        </div>
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
