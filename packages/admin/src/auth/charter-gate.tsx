import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Charter } from "@projet-igsn/design-system/components/ui/charter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@projet-igsn/design-system/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { useState } from "react";

import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";

import { SignOutButton } from "./sign-out-button.tsx";
import { useAcceptCharter } from "./use-accept-charter.ts";
import { useCurrentUser } from "./use-current-user.ts";

export function CharterGate({
  onSignOut,
  children,
}: {
  onSignOut: () => void;
  children?: ReactNode;
}) {
  const { data } = useCurrentUser();

  if (data?.charterAccepted === false) {
    return <CharterDialog onSignOut={onSignOut} />;
  }

  return children;
}

function CharterDialog({ onSignOut }: { onSignOut: () => void }) {
  const accept = useAcceptCharter();
  const [hasReadToEnd, setHasReadToEnd] = useState(false);

  const observeEnd = (end: HTMLDivElement | null) => {
    if (!end) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setHasReadToEnd(true);
    });
    observer.observe(end);
    return () => observer.disconnect();
  };

  const acceptButton = (
    <Button
      type="button"
      disabled={!hasReadToEnd || accept.isPending}
      onClick={() => accept.mutate()}
    >
      {m.charter_gate_accept()}
    </Button>
  );

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        closeLabel={m.action_close()}
        className="sm:max-w-3xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{m.charter_title()}</DialogTitle>
          <DialogDescription>{m.charter_subtitle()}</DialogDescription>
        </DialogHeader>
        <div
          role="region"
          aria-label={m.charter_title()}
          tabIndex={0}
          className="max-h-[60vh] overflow-y-auto pe-2"
        >
          <Charter m={m} faqHref={`${FRONTEND_URL}/faq`} />
          <div ref={observeEnd} className="h-px" />
        </div>
        <DialogFooter>
          <SignOutButton onSignOut={onSignOut} variant="ghost" size="default" />
          {hasReadToEnd ? (
            acceptButton
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="grid">
                  {acceptButton}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{m.charter_gate_scroll_hint()}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
