import type { ComponentProps, ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "#/confirm-button.tsx";

export type ConfirmMenuAction = {
  label: string;
  title: string;
  description: string;
  body?: ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void;
};

export type ConfirmMenuItem =
  | ConfirmMenuAction
  | { label: string; onSelect: () => void };

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
  const [pendingLabel, setPendingLabel] = useState<string>();
  const pending = items.find(
    (item): item is ConfirmMenuAction =>
      item.label === pendingLabel && "onConfirm" in item,
  );

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
              onSelect={() =>
                "onSelect" in item
                  ? item.onSelect()
                  : setPendingLabel(item.label)
              }
            >
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {pending ? (
        <ConfirmDialog
          open
          onOpenChange={() => setPendingLabel(undefined)}
          title={pending.title}
          description={pending.description}
          body={pending.body}
          confirmDisabled={pending.confirmDisabled}
          onConfirm={pending.onConfirm}
        />
      ) : null}
    </>
  );
}
