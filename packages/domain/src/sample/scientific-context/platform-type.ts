import { z } from "zod";

export const PLATFORM_TYPES = [
  "auv",
  "ship",
  "hov",
  "rov",
  "small_craft",
  "barge",
  "land_drill_platform",
  "marine_drill_platform",
  "vessel",
  "no_platform",
  "drill_rig",
  "light_inflatable_craft_under_2m",
  "inflatable_platform_under_5m",
  "small_craft_platform_under_5m",
  "craft_over_5m",
] as const;

export const platformTypeSchema = z.enum(PLATFORM_TYPES);

export type PlatformType = z.infer<typeof platformTypeSchema>;
