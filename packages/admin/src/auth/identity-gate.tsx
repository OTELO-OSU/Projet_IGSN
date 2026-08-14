import type { ReactNode } from "react";

import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";

import { CenteredLoader } from "./centered-loader.tsx";
import { CenteredScreen } from "./centered-screen.tsx";
import { SignOutButton } from "./sign-out-button.tsx";
import {
  UnsupportedIdentityProviderError,
  useCurrentUser,
} from "./use-current-user.ts";

export function IdentityGate({
  isOrcid,
  onSignOut,
  children,
}: {
  isOrcid: boolean;
  onSignOut: () => void;
  children?: ReactNode;
}) {
  const { data, error } = useCurrentUser();
  const isForbidden = error instanceof HttpError && error.status === 403;
  const forbiddenMessage =
    error instanceof UnsupportedIdentityProviderError
      ? m.account_unsupported_provider()
      : isOrcid
        ? m.auth_no_access()
        : m.account_rejected();

  if (isForbidden || (isOrcid && error)) {
    return (
      <CenteredScreen
        isError
        message={isForbidden ? forbiddenMessage : m.user_name_error()}
      >
        <SignOutButton onSignOut={onSignOut} />
      </CenteredScreen>
    );
  }

  if (isOrcid && !data) return <CenteredLoader />;
  return children;
}
