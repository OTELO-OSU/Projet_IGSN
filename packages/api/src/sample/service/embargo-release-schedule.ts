import { Cron } from "croner";

export const scheduleEmbargoRelease = (run: () => void): Cron =>
  new Cron(
    process.env.EMBARGO_RELEASE_CRON ?? "0 6 * * *",
    { timezone: "Europe/Paris" },
    run,
  );
