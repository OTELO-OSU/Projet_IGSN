import type { MailKind } from "./mail-kind.ts";
import type { User } from "./model.ts";

export function canReceiveMail(
  user: Pick<User, "status"> & { mailOptOuts: readonly MailKind[] },
  kind: MailKind,
): boolean {
  return user.status !== "rejected" && !user.mailOptOuts.includes(kind);
}
