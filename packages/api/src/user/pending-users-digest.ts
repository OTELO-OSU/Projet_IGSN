import type { PendingUser } from "@projet-igsn/domain/user/repository";

const HOUR_MS = 60 * 60 * 1000;

const plural = (count: number, unit: string) =>
  `${count} ${unit}${count === 1 ? "" : "s"}`;

function waitedFor(since: Date, now: Date): string {
  const hours = Math.floor((now.getTime() - since.getTime()) / HOUR_MS);
  if (hours < 1) return "less than an hour";
  if (hours < 24) return plural(hours, "hour");
  return plural(Math.floor(hours / 24), "day");
}

function accountLine(
  { email, name, firstname, createdAt }: PendingUser,
  now: Date,
) {
  const fullName = [firstname, name].filter(Boolean).join(" ");
  const who = fullName ? `${fullName} (${email})` : email;
  return `- ${who}, waiting for ${waitedFor(createdAt, now)}`;
}

export function pendingUsersDigest(
  pending: PendingUser[],
  now: Date,
): { subject: string; text: string } {
  const subject = `${pending.length} ${
    pending.length === 1 ? "user is" : "users are"
  } waiting for validation`;
  const lines = pending.map((user) => accountLine(user, now));
  return { subject, text: `${subject}:\n\n${lines.join("\n")}\n` };
}
