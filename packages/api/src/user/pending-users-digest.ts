import type { PendingUser } from "@projet-igsn/domain/user/repository";

import { fullName } from "@projet-igsn/domain/user/full-name";
import { readFileSync } from "node:fs";

import type { Translator } from "../mail/i18n.ts";

import { escapeHtml } from "../mail/escape-html.ts";
import { translator } from "../mail/i18n.ts";
import { renderMjml } from "../mail/render-mjml.ts";

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

const render = (
  t: Translator,
  title: string,
  rows: string,
  usersUrl: string,
): Promise<string> =>
  renderMjml(TEMPLATE, {
    __TITLE__: title,
    __COLUMN_NAME__: t("mail_digest_column_name"),
    __COLUMN_EMAIL__: t("mail_digest_column_email"),
    __COLUMN_WAITED__: t("mail_digest_column_waited"),
    __ROWS__: rows,
    __CTA__: t("mail_digest_cta"),
    __LINK_FALLBACK__: t("mail_link_fallback"),
    __URL__: escapeHtml(usersUrl),
  });

export async function pendingUsersDigest(
  pending: PendingUser[],
  usersUrl: string,
  now: Date,
): Promise<{ subject: string; text: string; html: string }> {
  const t = translator();
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
