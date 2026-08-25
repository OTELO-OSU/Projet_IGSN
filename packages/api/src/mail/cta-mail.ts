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
  quote?: string;
  cta: string;
  url: string;
};

const quoteLines = (quote: string) =>
  quote
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

const quoteBlock = (quote: string) =>
  `<mj-text padding="8px 0 0"><blockquote style="margin: 0; border-left: 4px solid #d1d5db; padding: 0 0 0 12px; color: #6b7280; white-space: pre-wrap">${quote}</blockquote></mj-text>`;

export async function ctaMail({
  recipient,
  subject,
  body,
  quote,
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
    text: `${greeting}\n\n${body}\n\n${quote === undefined ? "" : `${quoteLines(quote)}\n\n`}${cta}: ${url}\n`,
    html: await renderMjml(TEMPLATE, {
      __TITLE__: escapeHtml(subject),
      __GREETING__: escapeHtml(greeting),
      __BODY__: escapeHtml(body),
      __QUOTE__: quote === undefined ? "" : quoteBlock(escapeHtml(quote)),
      __CTA__: cta,
      __LINK_FALLBACK__: t("mail_link_fallback"),
      __URL__: escapeHtml(url),
    }),
  };
}
