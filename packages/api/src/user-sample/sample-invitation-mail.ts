import type { User } from "@projet-igsn/domain/user/model";

import mjml2html from "mjml";
import { readFileSync } from "node:fs";

import type { Locale } from "../mail/i18n.ts";

import { escapeHtml } from "../mail/escape-html.ts";
import { DEFAULT_LOCALE, translator } from "../mail/i18n.ts";
import { fullName } from "../user/full-name.ts";

const TEMPLATE = readFileSync(
  new URL("../mail/cta-mail.mjml", import.meta.url),
  "utf8",
);

export type SampleInvitation = {
  invitee: Pick<User, "email" | "name" | "firstname">;
  inviter: Pick<User, "email" | "name" | "firstname">;
  sampleName: string;
  sampleUrl: string;
};

// ponytail: locale is always the default until a `user.locale` column, fed from the Keycloak claim, carries the invitee's own.
export async function sampleInvitationMail(
  { invitee, inviter, sampleName, sampleUrl }: SampleInvitation,
  locale: Locale = DEFAULT_LOCALE,
): Promise<{ subject: string; text: string; html: string }> {
  const t = translator(locale);
  const named = fullName(invitee);
  const greeting = named
    ? t("mail_greeting", { name: named })
    : t("mail_greeting_anonymous");
  const params = {
    inviter: fullName(inviter) || inviter.email,
    sample: sampleName,
  };
  const subject = t("mail_invitation_subject", params);
  const body = t("mail_invitation_body", params);
  const cta = t("mail_invitation_cta");
  const { html } = await mjml2html(
    TEMPLATE.replaceAll("__TITLE__", escapeHtml(subject))
      .replace("__GREETING__", escapeHtml(greeting))
      .replace("__BODY__", escapeHtml(body))
      .replace("__CTA__", cta)
      .replace("__URL__", escapeHtml(sampleUrl)),
  );
  return {
    subject,
    text: `${greeting}\n\n${body}\n\n${cta}: ${sampleUrl}\n`,
    html,
  };
}
