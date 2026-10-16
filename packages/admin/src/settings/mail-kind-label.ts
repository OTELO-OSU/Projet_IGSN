import type { MailKind } from "@projet-igsn/domain/user/mail-kind";

import { m } from "#/paraglide/messages.js";

const MAIL_KIND_LABELS: Record<MailKind, () => string> = {
  sample_publication: m.mail_kind_sample_publication,
  sample_deleted: m.mail_kind_sample_deleted,
  sample_moderated: m.mail_kind_sample_moderated,
  sub_sample_declared: m.mail_kind_sub_sample_declared,
  sample_invitation: m.mail_kind_sample_invitation,
  manual_group_invitation: m.mail_kind_manual_group_invitation,
  pending_users_digest: m.mail_kind_pending_users_digest,
};

export function mailKindLabel(kind: MailKind): string {
  return MAIL_KIND_LABELS[kind]();
}
