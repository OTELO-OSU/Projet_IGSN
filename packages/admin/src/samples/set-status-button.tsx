import { ConfirmButton } from "#/confirm-button.tsx";
import { m } from "#/paraglide/messages.js";
import { ConfirmMenuButton } from "#/samples/confirm-menu-button.tsx";

type SetStatusText = "published" | "withdrawn" | "publish_now";

const TEXT: Record<
  SetStatusText,
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
  publish_now: {
    label: m.action_publish_now,
    title: m.publish_now_sample_title,
    description: m.publish_now_sample_warning,
  },
};

type SetStatusChoice = { text: SetStatusText; onConfirm: () => void };

export function SetStatusButton({
  text,
  onConfirm,
  menu,
  disabled,
}: SetStatusChoice & { menu?: SetStatusChoice; disabled?: boolean }) {
  const { label, title, description } = TEXT[text];
  const button = (
    <ConfirmButton
      variant="outline"
      className={menu ? "rounded-r-none" : undefined}
      title={title()}
      description={description()}
      disabled={disabled}
      onConfirm={onConfirm}
    >
      {label()}
    </ConfirmButton>
  );
  if (!menu) return button;
  const menuText = TEXT[menu.text];
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
            onConfirm: menu.onConfirm,
          },
        ]}
      />
    </div>
  );
}
