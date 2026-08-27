import type { ComponentProps } from "react";

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

/** A discreet chevron attached to a main button, hiding one confirmed action in its menu. */
export function ConfirmMenuButton({
  label,
  disabled,
  variant,
  className,
  itemLabel,
  title,
  description,
  onConfirm,
}: {
  label: string;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
  itemLabel: string;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      title={title}
      description={description}
      confirmLabel={m.action_confirm()}
      cancelLabel={m.action_cancel()}
      closeLabel={m.action_close()}
      onConfirm={onConfirm}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={variant}
            aria-label={label}
            className={className}
            disabled={disabled}
          >
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem>{itemLabel}</DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
    </ConfirmDialog>
  );
}
