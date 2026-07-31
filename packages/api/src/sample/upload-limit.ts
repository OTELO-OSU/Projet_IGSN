import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { z } from "zod";

// How many attachments a sample may carry, read once at import. Garbage or an
// unusable value (zero, negative, fractional) falls back to the domain default
// rather than crashing the api.
export const uploadLimit: number = z.coerce
  .number()
  .int()
  .min(1)
  .catch(DEFAULT_UPLOAD_LIMIT)
  .parse(process.env.UPLOAD_LIMIT);
