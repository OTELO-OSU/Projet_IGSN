import { Cron } from "croner";
import { z } from "zod";

const DAILY_AT_SIX = "0 6 * * *";

export const embargoReleaseCron: string = z
  .string()
  .default(DAILY_AT_SIX)
  .parse(process.env.EMBARGO_RELEASE_CRON);

export const scheduleEmbargoRelease = (
  run: () => void,
  pattern: string = embargoReleaseCron,
): Cron => new Cron(pattern, { timezone: "Europe/Paris" }, run);
