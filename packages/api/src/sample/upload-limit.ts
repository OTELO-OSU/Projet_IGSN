import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { z } from "zod";

export const uploadLimit: number = z.coerce
  .number()
  .int()
  .min(1)
  .catch(DEFAULT_UPLOAD_LIMIT)
  .parse(process.env.UPLOAD_LIMIT);
