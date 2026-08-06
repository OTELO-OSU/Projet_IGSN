import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";

import { AppLayout } from "./app-layout.tsx";
import { CenteredScreen } from "./centered-screen.tsx";
import { OrcidAccessGate } from "./orcid-access-gate.tsx";

// sign-in redirects to Keycloak, whose own login page offers the identity
// providers. The SSO owns that list (GaiaData's differs from the mock realm's),
// so the app sends no kc_idp_hint.
export function AuthGate({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const signIn = () =>
    void auth.signinRedirect({
      // oidc-client-ts sends no nonce by default on the code flow; given one it
      // stores it and verifies the id_token claim (GT-SSO REQ-PARAM-00/01).
      nonce: crypto.randomUUID(),
    });
  const signOut = () => void auth.signoutRedirect();

  if (auth.isLoading) return <p>{m.auth_loading()}</p>;
  if (auth.error) return <p>{m.auth_error({ message: auth.error.message })}</p>;

  if (!auth.isAuthenticated) {
    return (
      <CenteredScreen message={m.auth_welcome()}>
        <Button type="button" size="lg" onClick={signIn}>
          {m.auth_sign_in()}
        </Button>
      </CenteredScreen>
    );
  }

  // ORCID is a link-then-login mechanism, not a cold-start path: an ORCID
  // session reaches the app only when the api resolves its orcid to a linked
  // account (ADR 0020).
  const identityProvider = auth.user?.profile.identity_provider;
  if (
    typeof identityProvider === "string" &&
    identityProvider.toLowerCase() === "orcid"
  ) {
    return (
      <OrcidAccessGate onSignOut={signOut}>
        <AppLayout onSignOut={signOut}>{children}</AppLayout>
      </OrcidAccessGate>
    );
  }

  return <AppLayout onSignOut={signOut}>{children}</AppLayout>;
}
