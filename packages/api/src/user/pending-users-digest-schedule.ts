import { Cron } from "croner";

export const DIGEST_SCHEDULE = "0 7 * * *";

export const DIGEST_TIMEZONE = "Europe/Paris";

export const schedulePendingUsersDigest = (send: () => void): Cron =>
  new Cron(DIGEST_SCHEDULE, { timezone: DIGEST_TIMEZONE }, send);
