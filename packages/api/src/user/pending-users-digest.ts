import type { PendingUser } from "@projet-igsn/domain/user/repository";

import mjml2html from "mjml";
import { readFileSync } from "node:fs";

const HOUR_MS = 60 * 60 * 1000;

const TEMPLATE = readFileSync(
  new URL("./pending-users-digest.mjml", import.meta.url),
  "utf8",
);

const plural = (count: number, unit: string) =>
  `${count} ${unit}${count === 1 ? "" : "s"}`;

function waitedFor(since: Date, now: Date): string {
  const hours = Math.floor((now.getTime() - since.getTime()) / HOUR_MS);
  if (hours < 1) return "less than an hour";
  if (hours < 24) return plural(hours, "hour");
  return plural(Math.floor(hours / 24), "day");
}

const fullName = ({ name, firstname }: PendingUser) =>
  [firstname, name].filter(Boolean).join(" ");

function accountLine(user: PendingUser, now: Date) {
  const named = fullName(user);
  const who = named ? `${named} (${user.email})` : user.email;
  return `- ${who}, waiting for ${waitedFor(user.createdAt, now)}`;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const accountRow = (user: PendingUser, now: Date) =>
  [
    "<tr>",
    `<td>${escapeHtml(fullName(user))}</td>`,
    `<td>${escapeHtml(user.email)}</td>`,
    `<td>${escapeHtml(waitedFor(user.createdAt, now))}</td>`,
    "</tr>",
  ].join("");

async function render(
  title: string,
  rows: string,
  usersUrl: string,
): Promise<string> {
  const { html, errors } = await mjml2html(
    TEMPLATE.replaceAll("__TITLE__", escapeHtml(title))
      .replace("__ROWS__", rows)
      .replace("__USERS_URL__", escapeHtml(usersUrl)),
  );
  const [failure] = errors;
  if (failure) throw new Error(failure.formattedMessage);
  return html;
}

export async function pendingUsersDigest(
  pending: PendingUser[],
  usersUrl: string,
  now: Date,
): Promise<{ subject: string; text: string; html: string }> {
  const subject = `${pending.length} ${
    pending.length === 1 ? "user is" : "users are"
  } waiting for validation`;
  const lines = pending.map((user) => accountLine(user, now)).join("\n");
  return {
    subject,
    text: `${subject}:\n\n${lines}\n\nModerate these accounts: ${usersUrl}\n`,
    html: await render(
      subject,
      pending.map((user) => accountRow(user, now)).join(""),
      usersUrl,
    ),
  };
}
