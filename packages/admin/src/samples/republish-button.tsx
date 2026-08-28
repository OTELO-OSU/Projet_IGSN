import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";

import { m } from "#/paraglide/messages.js";

export function RepublishButton({
  disabled,
  onConfirm,
}: {
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <ConfirmButton
      variant="outline"
      title={m.republish_sample_title()}
      description={m.republish_sample_warning()}
      confirmLabel={m.action_confirm()}
      cancelLabel={m.action_cancel()}
      closeLabel={m.action_close()}
      disabled={disabled}
      onConfirm={onConfirm}
    >
      {m.action_republish_sample()}
    </ConfirmButton>
  );
}
