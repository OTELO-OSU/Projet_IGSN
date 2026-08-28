import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { translator } from "../mail/i18n.ts";
import { groupPageUrl } from "./group-page-url.ts";

export function groupWithoutManagerMail(
  group: OrphanedGroup,
  adminUrl: string,
): Promise<RenderedMail> {
  const t = translator();
  return ctaMail({
    recipient: { name: null, firstname: null },
    subject: t("mail_group_without_manager_subject", { group: group.name }),
    body: t("mail_group_without_manager_body", { group: group.name }),
    cta: t("mail_group_without_manager_cta"),
    url: groupPageUrl(group, adminUrl),
  });
}
