import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";

import { ConfirmButton } from "#/confirm-button.tsx";
import { m } from "#/paraglide/messages.js";
import { ConfirmMenuButton } from "#/samples/confirm-menu-button.tsx";

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
  menuStatus,
  disabled,
  onConfirm,
}: {
  status: PublishStatus;
  menuStatus?: PublishStatus;
  disabled?: boolean;
  onConfirm: (to: PublishStatus) => void;
}) {
  const text = TEXT[status];
  const button = (
    <ConfirmButton
      variant="outline"
      className={menuStatus ? "rounded-r-none" : undefined}
      title={text.title()}
      description={text.description()}
      disabled={disabled}
      onConfirm={() => onConfirm(status)}
    >
      {text.label()}
    </ConfirmButton>
  );
  if (!menuStatus) return button;
  const menuText = TEXT[menuStatus];
  return (
    <div className="flex">
      {button}
      <ConfirmMenuButton
        label={m.action_status_options()}
        variant="outline"
        className="-ml-px rounded-l-none"
        disabled={disabled}
        items={[
          {
            label: menuText.label(),
            title: menuText.title(),
            description: menuText.description(),
            onConfirm: () => onConfirm(menuStatus),
          },
        ]}
      />
    </div>
  );
}
