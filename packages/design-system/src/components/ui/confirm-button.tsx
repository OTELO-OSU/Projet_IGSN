import type { ComponentProps } from "react";

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

type ConfirmButtonProps = ComponentProps<typeof Button> & {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  confirmPhrase?: ConfirmPhrase;
  onConfirm: () => void;
};

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
