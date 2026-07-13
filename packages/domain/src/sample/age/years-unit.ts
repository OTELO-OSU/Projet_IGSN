import { z } from "zod";

// Calendar reference a numeric age is counted from: Common Era, Before Common
// Era, Before Present, calibrated Before Present.
export const yearsUnitSchema = z.enum(["ce", "bce", "bp", "cal_bp"]);

export type YearsUnit = z.infer<typeof yearsUnitSchema>;
