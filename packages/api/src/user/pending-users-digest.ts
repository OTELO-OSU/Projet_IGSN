import type { PendingUser } from "@projet-igsn/domain/user/repository";

import mjml2html from "mjml";
import { readFileSync } from "node:fs";

import type { Locale, Translator } from "../mail/i18n.ts";

import { escapeHtml } from "../mail/escape-html.ts";
import { DEFAULT_LOCALE, translator } from "../mail/i18n.ts";
import { fullName } from "./full-name.ts";

const HOUR_MS = 60 * 60 * 1000;

const TEMPLATE = readFileSync(
  new URL("./pending-users-digest.mjml", import.meta.url),
  "utf8",
);

function waitedFor(t: Translator, since: Date, now: Date): string {
  const hours = Math.floor((now.getTime() - since.getTime()) / HOUR_MS);
  if (hours < 1) return t("mail_digest_waited_under_hour");
  if (hours < 24) return t("mail_digest_waited_hours", { count: hours });
  return t("mail_digest_waited_days", { count: Math.floor(hours / 24) });
}

function accountLine(t: Translator, user: PendingUser, now: Date) {
  const named = fullName(user);
  const who = named ? `${named} (${user.email})` : user.email;
  return t("mail_digest_account_line", {
    who,
    waited: waitedFor(t, user.createdAt, now),
  });
}

const accountRow = (t: Translator, user: PendingUser, now: Date) =>
  [
    "<tr>",
    `<td>${escapeHtml(fullName(user))}</td>`,
    `<td>${escapeHtml(user.email)}</td>`,
    `<td>${escapeHtml(waitedFor(t, user.createdAt, now))}</td>`,
    "</tr>",
  ].join("");

async function render(
  t: Translator,
  title: string,
  rows: string,
  usersUrl: string,
): Promise<string> {
  const { html } = await mjml2html(
    TEMPLATE.replaceAll("__TITLE__", title)
      .replace("__COLUMN_NAME__", t("mail_digest_column_name"))
      .replace("__COLUMN_EMAIL__", t("mail_digest_column_email"))
      .replace("__COLUMN_WAITED__", t("mail_digest_column_waited"))
      .replace("__ROWS__", rows)
      .replace("__CTA__", t("mail_digest_cta"))
      .replace("__USERS_URL__", escapeHtml(usersUrl)),
  );
  return html;
}

// ponytail: locale is always the default until a `user.locale` column, fed from the Keycloak claim, carries the admin's own.
export async function pendingUsersDigest(
  pending: PendingUser[],
  usersUrl: string,
  now: Date,
  locale: Locale = DEFAULT_LOCALE,
): Promise<{ subject: string; text: string; html: string }> {
  const t = translator(locale);
  const subject = t("mail_digest_subject", { count: pending.length });
  const lines = pending.map((user) => accountLine(t, user, now)).join("\n");
  return {
    subject,
    text: `${subject}:\n\n${lines}\n\n${t("mail_digest_cta")}: ${usersUrl}\n`,
    html: await render(
      t,
      subject,
      pending.map((user) => accountRow(t, user, now)).join(""),
      usersUrl,
    ),
  };
}
