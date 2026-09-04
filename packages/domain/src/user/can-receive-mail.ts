import type { User } from "./model.ts";

export function canReceiveMail(user: Pick<User, "status">): boolean {
  return user.status !== "rejected";
}
