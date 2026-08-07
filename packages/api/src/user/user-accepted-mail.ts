import type { User } from "@projet-igsn/domain/user/model";

import mjml2html from "mjml";
import { readFileSync } from "node:fs";

import type { Locale } from "../mail/i18n.ts";

import { escapeHtml } from "../mail/escape-html.ts";
import { DEFAULT_LOCALE, translator } from "../mail/i18n.ts";
import { fullName } from "./full-name.ts";

const TEMPLATE = readFileSync(
  new URL("../mail/cta-mail.mjml", import.meta.url),
  "utf8",
);

// ponytail: locale is always the default until a `user.locale` column, fed from the Keycloak claim, carries the user's own.
export async function userAcceptedMail(
  user: Pick<User, "name" | "firstname">,
  adminUrl: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<{ subject: string; text: string; html: string }> {
  const t = translator(locale);
  const named = fullName(user);
  const greeting = named
    ? t("mail_greeting", { name: named })
    : t("mail_greeting_anonymous");
  const subject = t("mail_account_approved_subject");
  const body = t("mail_account_approved_body");
  const cta = t("mail_account_approved_cta");
  const { html } = await mjml2html(
    TEMPLATE.replaceAll("__TITLE__", subject)
      .replace("__GREETING__", escapeHtml(greeting))
      .replace("__BODY__", body)
      .replace("__CTA__", cta)
      .replace("__URL__", escapeHtml(adminUrl)),
  );
  return {
    subject,
    text: `${greeting}\n\n${body}\n\n${cta}: ${adminUrl}\n`,
    html,
  };
}
