import { z } from "zod";

import { zodValidator } from "./zod-validator.ts";

export const idParamSchema = z.object({ id: z.uuid() });

export const validateUuidIdParam = (error: string) =>
  zodValidator("param", idParamSchema, error);
