import { z } from "zod";

export const yearsUnitSchema = z.enum(["ce", "bce", "bp", "cal_bp"]);

export type YearsUnit = z.infer<typeof yearsUnitSchema>;
