import { z } from "zod";

export const VERTICAL_REFERENCES = [
  "elevation",
  "depth_below_ground",
  "depth_below_sea_floor",
  "bathymetry",
  "core_depth",
  "other",
] as const;

export const verticalReferenceSchema = z.enum(VERTICAL_REFERENCES);

export type VerticalReference = z.infer<typeof verticalReferenceSchema>;
