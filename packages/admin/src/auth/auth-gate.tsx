import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";

import { AccountGate } from "./account-gate.tsx";
import { AppLayout } from "./app-layout.tsx";
import { CenteredScreen } from "./centered-screen.tsx";
import { InstitutionalGroupsGate } from "./institutional-groups-gate.tsx";
import { OrcidAccessGate } from "./orcid-access-gate.tsx";

// The SSO owns that list (GaiaData's differs from the mock realm's),
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
  const Gate =
    typeof identityProvider === "string" &&
    identityProvider.toLowerCase() === "orcid"
      ? OrcidAccessGate
      : AccountGate;

  // Inside the authenticated branch only: the gate reads the api identity, which
  // an unauthenticated render has no token (and no QueryClient) for.
  return (
    <Gate onSignOut={signOut}>
      <InstitutionalGroupsGate onSignOut={signOut}>
        <AppLayout onSignOut={signOut}>{children}</AppLayout>
      </InstitutionalGroupsGate>
    </Gate>
  );
}
