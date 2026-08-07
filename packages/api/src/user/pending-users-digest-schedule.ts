import { Cron } from "croner";

export const schedulePendingUsersDigest = (send: () => void): Cron =>
  new Cron("0 7 * * *", { timezone: "Europe/Paris" }, send);
