import type { CurrentUser } from "@projet-igsn/domain/user/current-user";

import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { MAIL_KINDS } from "@projet-igsn/domain/user/mail-kind";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";
import { mailKindLabel } from "#/settings/mail-kind-label.ts";
import { useSetMailOptOut } from "#/settings/use-set-mail-opt-out.ts";

function MailRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={!onCheckedChange}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

export function MailPreferences({ user }: { user: CurrentUser }) {
  const setMailOptOut = useSetMailOptOut();
  const getsDigest = !user.superAdmin && user.managedLaboratories.length > 0;
  const kinds = MAIL_KINDS.filter(
    (kind) => kind !== "pending_users_digest" || getsDigest,
  );
  const alwaysSent = [
    m.settings_emails_contact(),
    m.settings_emails_sample_removal(),
    m.settings_emails_account_approved(),
    ...(user.superAdmin
      ? [
          m.settings_emails_super_admin_digest(),
          m.settings_emails_user_requests(),
          m.settings_emails_group_without_manager(),
        ]
      : []),
  ];

  return (
    <FormSection
      title={m.settings_emails_title()}
      description={m.settings_emails_hint()}
    >
      {kinds.map((kind) => (
        <MailRow
          key={kind}
          label={mailKindLabel(kind)}
          checked={!user.mailOptOuts.includes(kind)}
          onCheckedChange={(checked) =>
            setMailOptOut.mutate({ kind, optOut: !checked })
          }
        />
      ))}
      <FormSection title={m.settings_emails_always_sent()} level={3}>
        {alwaysSent.map((label) => (
          <MailRow key={label} label={label} checked />
        ))}
      </FormSection>
    </FormSection>
  );
}
