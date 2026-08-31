import type { ComponentProps } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { ConfirmDialog } from "@projet-igsn/design-system/components/ui/confirm-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";

export type ConfirmMenuItem = {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
};

export function ConfirmMenuButton({
  label,
  disabled,
  variant,
  className,
  items,
}: {
  label: string;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
  items: ConfirmMenuItem[];
}) {
  const [pending, setPending] = useState<ConfirmMenuItem>();

  return (
    <>
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
          {items.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onSelect={() => setPending(item)}
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {pending ? (
        <ConfirmDialog
          open
          onOpenChange={() => setPending(undefined)}
          title={pending.title}
          description={pending.description}
          confirmLabel={m.action_confirm()}
          cancelLabel={m.action_cancel()}
          closeLabel={m.action_close()}
          onConfirm={pending.onConfirm}
        />
      ) : null}
    </>
  );
}
