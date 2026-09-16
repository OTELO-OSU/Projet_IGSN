import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMailFor } from "../mail/cta-mail.ts";
import { groupPageUrl } from "./group-page-url.ts";

export function groupWithoutManagerMail(
  group: OrphanedGroup,
  adminUrl: string,
): Promise<RenderedMail> {
  return ctaMailFor("group_without_manager", {
    recipient: { name: null, firstname: null },
    params: { group: group.name },
    url: groupPageUrl(group, adminUrl),
  });
}
