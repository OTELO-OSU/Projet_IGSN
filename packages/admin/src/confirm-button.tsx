import type { ComponentProps } from "react";

import {
  ConfirmButton as BaseConfirmButton,
  ConfirmDialog as BaseConfirmDialog,
} from "@projet-igsn/design-system/components/ui/confirm-button";

import { m } from "#/paraglide/messages.js";

type DefaultedLabels<P> = Omit<
  P,
  "cancelLabel" | "closeLabel" | "confirmLabel"
> & {
  confirmLabel?: string;
  cancelLabel?: string;
  closeLabel?: string;
};

export function ConfirmButton({
  confirmLabel = m.action_confirm(),
  cancelLabel = m.action_cancel(),
  closeLabel = m.action_close(),
  ...props
}: DefaultedLabels<ComponentProps<typeof BaseConfirmButton>>) {
  return (
    <BaseConfirmButton
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      {...props}
    />
  );
}

export function ConfirmDialog({
  confirmLabel = m.action_confirm(),
  cancelLabel = m.action_cancel(),
  closeLabel = m.action_close(),
  ...props
}: DefaultedLabels<ComponentProps<typeof BaseConfirmDialog>>) {
  return (
    <BaseConfirmDialog
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      closeLabel={closeLabel}
      {...props}
    />
  );
}
