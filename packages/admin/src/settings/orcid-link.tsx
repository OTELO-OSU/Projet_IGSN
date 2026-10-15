import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { useAuth } from "react-oidc-context";

import { isOrcidSession } from "#/auth/is-orcid-session.ts";
import { ConfirmButton } from "#/confirm-button.tsx";
import { m } from "#/paraglide/messages.js";

import type { OrcidReturn } from "./use-link-orcid.ts";

import { useLinkOrcidOnReturn, useStartOrcidLink } from "./use-link-orcid.ts";
import { useUnlinkOrcid } from "./use-unlink-orcid.ts";

export function OrcidLink({
  orcid,
  orcidReturn,
}: {
  orcid: string | null;
  orcidReturn: OrcidReturn;
}) {
  useLinkOrcidOnReturn(orcidReturn);
  const startLink = useStartOrcidLink();
  const unlink = useUnlinkOrcid();
  const isLocked = isOrcidSession(useAuth().user?.profile.identity_provider);

  if (orcid === null)
    return (
      <Button
        type="button"
        className="justify-self-start"
        disabled={startLink.isPending}
        onClick={() => startLink.mutate()}
      >
        {m.settings_orcid_link()}
      </Button>
    );

  const unlinkButton = (
    <ConfirmButton
      variant="outline"
      title={m.settings_orcid_unlink()}
      description={m.settings_orcid_unlink_description()}
      disabled={isLocked || unlink.isPending}
      onConfirm={() => unlink.mutate()}
    >
      {m.settings_orcid_unlink()}
    </ConfirmButton>
  );

  return (
    <div className="flex flex-wrap items-center gap-4">
      <p>{orcid}</p>
      {isLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="grid">
              {unlinkButton}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{m.settings_orcid_unlink_locked()}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        unlinkButton
      )}
    </div>
  );
}
