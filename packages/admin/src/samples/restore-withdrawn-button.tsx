import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";

import { m } from "#/paraglide/messages.js";

export function RestoreWithdrawnButton({
  disabled,
  onConfirm,
}: {
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <ConfirmButton
      variant="outline"
      title={m.restore_withdrawn_sample_title()}
      description={m.restore_withdrawn_sample_warning()}
      confirmLabel={m.action_confirm()}
      cancelLabel={m.action_cancel()}
      closeLabel={m.action_close()}
      disabled={disabled}
      onConfirm={onConfirm}
    >
      {m.action_restore_withdrawn()}
    </ConfirmButton>
  );
}
