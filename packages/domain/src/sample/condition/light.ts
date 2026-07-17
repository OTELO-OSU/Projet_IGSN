import { z } from "zod";

export const LIGHTS = [
  "total_darkness",
  "attenuated_natural_light",
  "artificial_light",
  "uv_protection",
] as const;

export const lightSchema = z.enum(LIGHTS);

export type Light = z.infer<typeof lightSchema>;
