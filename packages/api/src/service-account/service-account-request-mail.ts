import type { ServiceAccountDraft } from "@projet-igsn/domain/service-account/service-account-validator";
import type { User } from "@projet-igsn/domain/user/model";

import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { fullName } from "@projet-igsn/domain/user/full-name";

import type { RenderedMail } from "../mail/send-mail.ts";

import { ctaMail } from "../mail/cta-mail.ts";
import { type Translator, translator } from "../mail/i18n.ts";

export type ServiceAccountRequestMail = {
  requester: Pick<User, "email" | "name" | "firstname">;
  draft: ServiceAccountDraft;
  manualGroupNames: string[];
  adminUrl: string;
};

function requestUrl(adminUrl: string, draft: ServiceAccountDraft): string {
  const url = new URL("service-accounts/create", adminUrl);
  url.searchParams.set("request", JSON.stringify(draft));
  return url.toString();
}

function requestedGroups(
  t: Translator,
  { managedGroups }: ServiceAccountDraft,
  manualGroupNames: string[],
): string {
  const lines: [string, string[]][] = [
    [
      t("mail_service_account_request_organizations"),
      managedGroups.organizations.map(organizationLabel),
    ],
    [t("mail_service_account_request_osus"), managedGroups.osus.map(osuLabel)],
    [
      t("mail_service_account_request_laboratories"),
      managedGroups.laboratories.map(laboratoryLabel),
    ],
    [t("mail_service_account_request_manual_groups"), manualGroupNames],
  ];
  return lines
    .filter(([, values]) => values.length > 0)
    .map(([label, values]) => `${label}: ${values.join(", ")}`)
    .join("\n");
}

export async function serviceAccountRequestMail({
  requester,
  draft,
  manualGroupNames,
  adminUrl,
}: ServiceAccountRequestMail): Promise<RenderedMail> {
  const t = translator();
  const params = {
    requester: fullName(requester) || requester.email,
    laboratory: draft.institutionalLaboratory
      ? laboratoryLabel(draft.institutionalLaboratory)
      : t("mail_service_account_request_no_laboratory"),
    name: draft.name,
  };
  const quote = requestedGroups(t, draft, manualGroupNames);
  return ctaMail({
    recipient: { name: null, firstname: null },
    subject: t("mail_service_account_request_subject", params),
    body: t("mail_service_account_request_body", params),
    quote: quote || undefined,
    cta: t("mail_service_account_request_cta"),
    url: requestUrl(adminUrl, draft),
  });
}
