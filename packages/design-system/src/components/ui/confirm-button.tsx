import type { ComponentProps, ReactNode } from "react";

import { useId, useState } from "react";

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
import { Input } from "./input.tsx";
import { Label } from "./label.tsx";

type ConfirmPhrase = { text: string; label: string };

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  confirmPhrase?: ConfirmPhrase;
  onConfirm: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};

type ConfirmButtonProps = ComponentProps<typeof Button> &
  Omit<ConfirmDialogProps, "children">;

export function ConfirmButton({
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  confirmPhrase,
  onConfirm,
  children,
  ...buttonProps
}: ConfirmButtonProps) {
  return (
    <ConfirmDialog
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      confirmPhrase={confirmPhrase}
      onConfirm={onConfirm}
    >
      <DialogTrigger asChild>
        <Button type="button" {...buttonProps}>
          {children}
        </Button>
      </DialogTrigger>
    </ConfirmDialog>
  );
}

/** A confirm dialog whose trigger the caller renders as `children` (a `DialogTrigger`, possibly nested in a menu). */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  confirmPhrase,
  onConfirm,
  open,
  onOpenChange,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent closeLabel={closeLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ConfirmBody
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          confirmPhrase={confirmPhrase}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmBody({
  confirmLabel,
  cancelLabel,
  confirmPhrase,
  onConfirm,
}: {
  confirmLabel: string;
  cancelLabel: string;
  confirmPhrase?: ConfirmPhrase;
  onConfirm: () => void;
}) {
  const inputId = useId();
  const [typed, setTyped] = useState("");

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {confirmPhrase ? (
        <div className="grid gap-2">
          <Label htmlFor={inputId}>{confirmPhrase.label}</Label>
          <Input
            id={inputId}
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      ) : null}
      <DialogFooter showCloseButton closeLabel={cancelLabel}>
        <DialogClose asChild>
          <Button
            type="submit"
            variant="destructive"
            disabled={confirmPhrase ? typed !== confirmPhrase.text : false}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogClose>
      </DialogFooter>
    </form>
  );
}
