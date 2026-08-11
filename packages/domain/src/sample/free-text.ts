import { z } from "zod";

export const freeTextSchema = z.string().trim().min(1);
