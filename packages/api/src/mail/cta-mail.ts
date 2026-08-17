import type { User } from "@projet-igsn/domain/user/model";

import { fullName } from "@projet-igsn/domain/user/full-name";
import { readFileSync } from "node:fs";

import type { RenderedMail } from "./send-mail.ts";

import { escapeHtml } from "./escape-html.ts";
import { translator } from "./i18n.ts";
import { renderMjml } from "./render-mjml.ts";

const TEMPLATE = readFileSync(
  new URL("cta-mail.mjml", import.meta.url),
  "utf8",
);

export type CtaMail = {
  recipient: Pick<User, "name" | "firstname">;
  subject: string;
  body: string;
  cta: string;
  url: string;
};

export async function ctaMail({
  recipient,
  subject,
  body,
  cta,
  url,
}: CtaMail): Promise<RenderedMail> {
  const t = translator();
  const named = fullName(recipient);
  const greeting = named
    ? t("mail_greeting", { name: named })
    : t("mail_greeting_anonymous");
  return {
    subject,
    text: `${greeting}\n\n${body}\n\n${cta}: ${url}\n`,
    html: await renderMjml(TEMPLATE, {
      __TITLE__: escapeHtml(subject),
      __GREETING__: escapeHtml(greeting),
      __BODY__: escapeHtml(body),
      __CTA__: cta,
      __LINK_FALLBACK__: t("mail_link_fallback"),
      __URL__: escapeHtml(url),
    }),
  };
}
