import { Cron } from "croner";

export const scheduleStagedUploadCleanup = (cleanUp: () => void): Cron =>
  new Cron("0 * * * *", cleanUp);
