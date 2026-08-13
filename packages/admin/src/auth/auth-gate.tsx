import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";

import { AppLayout } from "./app-layout.tsx";
import { CenteredLoader } from "./centered-loader.tsx";
import { CenteredScreen } from "./centered-screen.tsx";
import { IdentityGate } from "./identity-gate.tsx";
import { InstitutionalGroupsGate } from "./institutional-groups-gate.tsx";
import { signIn } from "./sign-in.ts";
import { clearSignedOut, markSignedOut, readSignedOut } from "./signed-out.ts";

export function AuthGate({ children }: { children?: ReactNode }) {
  const auth = useAuth();
  const [hasSignedOut, setHasSignedOut] = useState(readSignedOut);
  const hasRedirected = useRef(false);
  const shouldSignIn =
    !hasSignedOut && !auth.isLoading && !auth.error && !auth.isAuthenticated;

  useEffect(() => clearSignedOut(), []);
  useEffect(() => {
    if (!shouldSignIn || hasRedirected.current) return;
    hasRedirected.current = true;
    signIn(auth);
  }, [shouldSignIn, auth]);

  const signOut = () => {
    setHasSignedOut(true);
    markSignedOut();
    void auth.signoutRedirect();
  };

  if (auth.isLoading || shouldSignIn) return <CenteredLoader />;
  if (auth.error)
    return (
      <CenteredScreen
        isError
        message={m.auth_error({ message: auth.error.message })}
      />
    );

  if (!auth.isAuthenticated) {
    return (
      <CenteredScreen message={m.auth_welcome()}>
        <Button type="button" size="lg" onClick={() => signIn(auth)}>
          {m.auth_sign_in()}
        </Button>
      </CenteredScreen>
    );
  }

  const identityProvider = auth.user?.profile.identity_provider;
  const isOrcid =
    typeof identityProvider === "string" &&
    identityProvider.toLowerCase() === "orcid";

  return (
    <IdentityGate isOrcid={isOrcid} onSignOut={signOut}>
      <InstitutionalGroupsGate onSignOut={signOut}>
        <AppLayout onSignOut={signOut}>{children}</AppLayout>
      </InstitutionalGroupsGate>
    </IdentityGate>
  );
}
