import type { User } from "@projet-igsn/domain/user/model";

import { readFileSync } from "node:fs";

import { escapeHtml } from "../mail/escape-html.ts";
import { translator } from "../mail/i18n.ts";
import { renderMjml } from "../mail/render-mjml.ts";
import { fullName } from "./full-name.ts";

const TEMPLATE = readFileSync(
  new URL("../mail/cta-mail.mjml", import.meta.url),
  "utf8",
);

export async function userAcceptedMail(
  user: Pick<User, "name" | "firstname">,
  adminUrl: string,
): Promise<{ subject: string; text: string; html: string }> {
  const t = translator();
  const named = fullName(user);
  const greeting = named
    ? t("mail_greeting", { name: named })
    : t("mail_greeting_anonymous");
  const subject = t("mail_account_approved_subject");
  const body = t("mail_account_approved_body");
  const cta = t("mail_account_approved_cta");
  return {
    subject,
    text: `${greeting}\n\n${body}\n\n${cta}: ${adminUrl}\n`,
    html: await renderMjml(TEMPLATE, {
      __TITLE__: subject,
      __GREETING__: escapeHtml(greeting),
      __BODY__: body,
      __CTA__: cta,
      __URL__: escapeHtml(adminUrl),
    }),
  };
}
