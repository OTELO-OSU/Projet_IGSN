import { z } from "zod";

// Stratigraphic time scale (International Commission on Stratigraphy). A
// 1-based integer ordered youngest (1) to oldest (49).
export const GEOLOGICAL_AGES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
  42, 43, 44, 45, 46, 47, 48, 49,
] as const;

export const geologicalAgeSchema = z.literal(GEOLOGICAL_AGES);

export type GeologicalAge = z.infer<typeof geologicalAgeSchema>;
