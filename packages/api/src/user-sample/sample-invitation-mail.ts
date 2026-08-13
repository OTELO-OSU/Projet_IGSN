import type { CollaboratorRole } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";
import { readFileSync } from "node:fs";

import { escapeHtml } from "../mail/escape-html.ts";
import { translator } from "../mail/i18n.ts";
import { renderMjml } from "../mail/render-mjml.ts";

const TEMPLATE = readFileSync(
  new URL("../mail/cta-mail.mjml", import.meta.url),
  "utf8",
);

export type SampleInvitation = {
  invitee: Pick<User, "email" | "name" | "firstname">;
  inviter: Pick<User, "email" | "name" | "firstname">;
  role: CollaboratorRole;
  sampleName: string;
  sampleUrl: string;
};

export async function sampleInvitationMail({
  invitee,
  inviter,
  role,
  sampleName,
  sampleUrl,
}: SampleInvitation): Promise<{
  subject: string;
  text: string;
  html: string;
}> {
  const t = translator();
  const named = fullName(invitee);
  const greeting = named
    ? t("mail_greeting", { name: named })
    : t("mail_greeting_anonymous");
  const params = {
    inviter: fullName(inviter) || inviter.email,
    sample: sampleName,
  };
  const subject = t("mail_invitation_subject", params);
  const body = t(`mail_invitation_body_${role}`, params);
  const cta = t("mail_invitation_cta");
  return {
    subject,
    text: `${greeting}\n\n${body}\n\n${cta}: ${sampleUrl}\n`,
    html: await renderMjml(TEMPLATE, {
      __TITLE__: escapeHtml(subject),
      __GREETING__: escapeHtml(greeting),
      __BODY__: escapeHtml(body),
      __CTA__: cta,
      __LINK_FALLBACK__: t("mail_link_fallback"),
      __URL__: escapeHtml(sampleUrl),
    }),
  };
}
