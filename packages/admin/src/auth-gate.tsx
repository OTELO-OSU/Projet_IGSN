import { Button } from "@projet-igsn/design-system/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "react-oidc-context";

import { ApiGreeting } from "./api-greeting.tsx";
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
    <div className="min-h-screen">
      {/* ponytail: App is currently just the title, so it serves as the header
          brand. When App gains real content, lift the <h1> into this header and
          render <App /> below it. */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <App />
        <div className="flex items-center gap-4">
          <ApiGreeting />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void auth.signoutRedirect()}
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </header>
    </div>
  );
}
