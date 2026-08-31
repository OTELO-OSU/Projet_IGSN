import type { OrphanedGroup } from "@projet-igsn/domain/user/orphaned-group";
import type { PendingUser } from "@projet-igsn/domain/user/repository";

import { fullName } from "@projet-igsn/domain/user/full-name";
import { readFileSync } from "node:fs";

import type { Translator } from "../mail/i18n.ts";

import { escapeHtml } from "../mail/escape-html.ts";
import { translator } from "../mail/i18n.ts";
import { renderMjml } from "../mail/render-mjml.ts";
import { groupPageUrl } from "./group-page-url.ts";

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

const pendingSection = (t: Translator, rows: string) =>
  rows === ""
    ? ""
    : [
        '<mj-table cellpadding="8">',
        '<tr style="text-align: left; border-bottom: 1px solid #e5e7eb">',
        `<th>${t("mail_digest_column_name")}</th>`,
        `<th>${t("mail_digest_column_email")}</th>`,
        `<th>${t("mail_digest_column_waited")}</th>`,
        "</tr>",
        rows,
        "</mj-table>",
      ].join("");

const groupsSection = (
  t: Translator,
  groups: OrphanedGroup[],
  adminUrl: string,
) =>
  groups.length === 0
    ? ""
    : [
        `<mj-text font-weight="bold" padding="16px 0 0">${escapeHtml(t("mail_digest_groups_title"))}</mj-text>`,
        ...groups.map((group) => {
          const url = escapeHtml(groupPageUrl(group, adminUrl));
          return `<mj-text padding="4px 0 0"><a href="${url}" style="color: #1d4ed8">${escapeHtml(group.name)}</a></mj-text>`;
        }),
      ].join("");

const groupLines = (t: Translator, groups: OrphanedGroup[], adminUrl: string) =>
  [
    `${t("mail_digest_groups_title")}:`,
    ...groups.map((group) =>
      t("mail_digest_group_line", {
        group: group.name,
        url: groupPageUrl(group, adminUrl),
      }),
    ),
  ].join("\n");

export async function pendingUsersDigest(
  pending: PendingUser[],
  orphanGroups: OrphanedGroup[],
  adminUrl: string,
  now: Date,
): Promise<{ subject: string; text: string; html: string }> {
  const usersUrl = new URL("/users", adminUrl).toString();
  const t = translator();
  const subject =
    pending.length > 0
      ? t("mail_digest_subject", { count: pending.length })
      : t("mail_digest_groups_subject", { count: orphanGroups.length });
  const blocks = [
    pending.length > 0
      ? pending.map((user) => accountLine(t, user, now)).join("\n")
      : null,
    orphanGroups.length > 0 ? groupLines(t, orphanGroups, adminUrl) : null,
  ].filter((block) => block !== null);
  return {
    subject,
    text: `${subject}:\n\n${blocks.join("\n\n")}\n\n${t("mail_digest_cta")}: ${usersUrl}\n`,
    html: await renderMjml(TEMPLATE, {
      __TITLE__: escapeHtml(subject),
      __PENDING_SECTION__: pendingSection(
        t,
        pending.map((user) => accountRow(t, user, now)).join(""),
      ),
      __GROUPS_SECTION__: groupsSection(t, orphanGroups, adminUrl),
      __CTA__: t("mail_digest_cta"),
      __LINK_FALLBACK__: t("mail_link_fallback"),
      __URL__: escapeHtml(usersUrl),
    }),
  };
}
