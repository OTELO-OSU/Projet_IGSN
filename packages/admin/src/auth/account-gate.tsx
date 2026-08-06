import type { ReactNode } from "react";

import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";

import { CenteredScreen } from "./centered-screen.tsx";
import { SignOutButton } from "./sign-out-button.tsx";
import { useCurrentUser } from "./use-current-user.ts";

// A rejected account is locked out by the api (403 on every authenticated
// route), so the identity call is what tells the app to show a denial instead
// of the app. Any other failure passes through: a flaky call must not lock a
// legitimate user out. The denial gives no reason (PO decision).
export function AccountGate({
  onSignOut,
  children,
}: {
  onSignOut: () => void;
  children?: ReactNode;
}) {
  const { error } = useCurrentUser();

  if (error instanceof HttpError && error.status === 403) {
    return (
      <CenteredScreen isError message={m.account_rejected()}>
        <SignOutButton onSignOut={onSignOut} />
      </CenteredScreen>
    );
  }

  return children;
}
