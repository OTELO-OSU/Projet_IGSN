import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";

import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";

import { m } from "#/paraglide/messages.js";

const TEXT: Record<
  PublishStatus,
  { label: () => string; title: () => string; description: () => string }
> = {
  published: {
    label: m.action_republish_sample,
    title: m.republish_sample_title,
    description: m.republish_sample_warning,
  },
  withdrawn: {
    label: m.action_restore_withdrawn,
    title: m.restore_withdrawn_sample_title,
    description: m.restore_withdrawn_sample_warning,
  },
};

export function SetStatusButton({
  status,
  disabled,
  onConfirm,
}: {
  status: PublishStatus;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const text = TEXT[status];
  return (
    <ConfirmButton
      variant="outline"
      title={text.title()}
      description={text.description()}
      confirmLabel={m.action_confirm()}
      cancelLabel={m.action_cancel()}
      closeLabel={m.action_close()}
      disabled={disabled}
      onConfirm={onConfirm}
    >
      {text.label()}
    </ConfirmButton>
  );
}
