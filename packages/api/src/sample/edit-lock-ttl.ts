import { z } from "zod";

const DEFAULT_TTL_MINUTES = 15;

export const editLockTtlMs: number =
  z.coerce
    .number()
    .int()
    .min(1)
    .catch(DEFAULT_TTL_MINUTES)
    .parse(process.env.SAMPLE_EDIT_LOCK_TTL_MINUTES) * 60_000;
