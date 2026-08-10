import type { ComponentProps } from "react";

import { Button } from "./button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog.tsx";

type ConfirmButtonProps = ComponentProps<typeof Button> & {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  onConfirm: () => void;
};

export function ConfirmButton({
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  onConfirm,
  children,
  ...buttonProps
}: ConfirmButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" {...buttonProps}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={closeLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton closeLabel={cancelLabel}>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
