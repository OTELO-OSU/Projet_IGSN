import type { ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

import { InstitutionalGroupsForm } from "../groups/institutional-groups-form.tsx";
import { CenteredScreen } from "./centered-screen.tsx";
import { SignOutButton } from "./sign-out-button.tsx";
import { useCurrentUser } from "./use-current-user.ts";

export function InstitutionalGroupsGate({
  onSignOut,
  children,
}: {
  onSignOut: () => void;
  children?: ReactNode;
}) {
  const { data } = useCurrentUser();

  // ponytail: no loading branch, like AccountGate: an identity call still in flight or failed must not hold the app, and the gate closes as soon as the answer says groups are missing
  const isMissingGroups =
    data !== undefined &&
    (data.institutionalOrganization === null ||
      data.institutionalLaboratory === null);

  if (isMissingGroups) {
    return (
      <CenteredScreen message={m.institutional_groups_intro()}>
        <InstitutionalGroupsForm />
        <SignOutButton onSignOut={onSignOut} />
      </CenteredScreen>
    );
  }

  return children;
}
