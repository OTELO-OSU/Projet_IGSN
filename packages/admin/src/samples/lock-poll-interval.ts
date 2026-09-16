import { z } from "zod";

const DEFAULT_POLL_SECONDS = 30;

export const LOCK_POLL_INTERVAL_MS: number =
  z.coerce
    .number()
    .int()
    .min(1)
    .catch(DEFAULT_POLL_SECONDS)
    .parse(import.meta.env.VITE_SAMPLE_LOCK_POLL_SECONDS) * 1000;
