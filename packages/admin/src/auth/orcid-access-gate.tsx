import type { ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

import { HttpError } from "../http-error.ts";
import { CenteredScreen } from "./centered-screen.tsx";
import { SignOutButton } from "./sign-out-button.tsx";
import { useCurrentUser } from "./use-current-user.ts";

// An ORCID session has app access only if the api resolves its orcid to a
// linked account (ADR 0020): a 403 means "link it first", anything else is a
// plain load failure. The api enforces the boundary; this screen explains it.
export function OrcidAccessGate({
  onSignOut,
  children,
}: {
  onSignOut: () => void;
  children?: ReactNode;
}) {
  const { data, error } = useCurrentUser();

  if (error) {
    const isNotLinked = error instanceof HttpError && error.status === 403;
    return (
      <CenteredScreen
        isError
        message={isNotLinked ? m.auth_no_access() : m.user_name_error()}
      >
        <SignOutButton onSignOut={onSignOut} />
      </CenteredScreen>
    );
  }
  if (!data) return <p>{m.auth_loading()}</p>;
  return children;
}
