import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";

import { AppLayout } from "./app-layout.tsx";
import { CenteredScreen } from "./centered-screen.tsx";
import { OrcidAccessGate } from "./orcid-access-gate.tsx";

// Login page + gate: unauthenticated users pick an identity provider, which
// redirects through Keycloak (kc_idp_hint) straight to that IdP. Accounts are
// provisioned on first login (first-broker-login). Authenticated users see the
// app (the routed children) behind this gate.
const signInWith = (auth: ReturnType<typeof useAuth>, idp: string) => () =>
  void auth.signinRedirect({
    // oidc-client-ts sends no nonce by default on the code flow; given one it
    // stores it and verifies the id_token claim (GT-SSO REQ-PARAM-00/01).
    nonce: crypto.randomUUID(),
    extraQueryParams: { kc_idp_hint: idp },
  });

export function AuthGate({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const signOut = () => void auth.signoutRedirect();

  if (auth.isLoading) return <p>{m.auth_loading()}</p>;
  if (auth.error) return <p>{m.auth_error({ message: auth.error.message })}</p>;

  if (!auth.isAuthenticated) {
    return (
      <CenteredScreen message={m.auth_welcome()}>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            size="lg"
            onClick={signInWith(auth, "shibboleth")}
          >
            {m.auth_sign_in_institution()}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={signInWith(auth, "orcid")}
          >
            {m.auth_sign_in_orcid()}
          </Button>
        </div>
      </CenteredScreen>
    );
  }

  // ORCID is a link-then-login mechanism, not a cold-start path: an ORCID
  // session reaches the app only when the api resolves its orcid to a linked
  // account (ADR 0020). Keycloak sets the identity_provider claim on brokered
  // logins; institution and local logins are not "orcid".
  if (auth.user?.profile.identity_provider === "orcid") {
    return (
      <OrcidAccessGate onSignOut={signOut}>
        <AppLayout onSignOut={signOut}>{children}</AppLayout>
      </OrcidAccessGate>
    );
  }

  return <AppLayout onSignOut={signOut}>{children}</AppLayout>;
}
