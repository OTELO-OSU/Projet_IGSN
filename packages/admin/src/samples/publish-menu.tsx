import { Button } from "@projet-igsn/design-system/components/ui/button";
import { ConfirmDialog } from "@projet-igsn/design-system/components/ui/confirm-button";
import { DialogTrigger } from "@projet-igsn/design-system/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

/** The discreet chevron next to Save & Publish, hiding the publish-as-withdrawn path. */
export function PublishMenu({
  disabled,
  onPublishWithdrawn,
}: {
  disabled: boolean;
  onPublishWithdrawn: () => void;
}) {
  return (
    <ConfirmDialog
      title={m.publish_withdrawn_sample_title()}
      description={m.publish_withdrawn_sample_warning()}
      confirmLabel={m.action_confirm()}
      cancelLabel={m.action_cancel()}
      closeLabel={m.action_close()}
      onConfirm={onPublishWithdrawn}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            aria-label={m.action_publish_options()}
            className="border-l-primary-foreground/30 rounded-l-none border-l"
            disabled={disabled}
          >
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem>{m.action_publish_withdrawn()}</DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
    </ConfirmDialog>
  );
}
