import { Cron } from "croner";

export const scheduleDataGouvExport = (run: () => void): Cron =>
  new Cron(
    process.env.DATA_GOUV_CRON ?? "0 3 1 * *",
    { timezone: "Europe/Paris" },
    run,
  );
