import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { LogOut } from "lucide-react";

import { m } from "#/paraglide/messages.js";

import { HttpError } from "../http-error.ts";
import { useGetMe } from "../use-get-me.ts";
import { CenteredScreen } from "./centered-screen.tsx";

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
  const { data, error } = useGetMe();

  if (error) {
    const isNotLinked = error instanceof HttpError && error.status === 403;
    return (
      <CenteredScreen
        isError
        message={isNotLinked ? m.auth_no_access() : m.user_name_error()}
      >
        <Button type="button" variant="outline" size="sm" onClick={onSignOut}>
          <LogOut />
          {m.action_sign_out()}
        </Button>
      </CenteredScreen>
    );
  }
  if (!data) return <p>{m.auth_loading()}</p>;
  return children;
}
