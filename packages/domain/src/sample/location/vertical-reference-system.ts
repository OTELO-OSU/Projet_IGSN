import { z } from "zod";

export const VERTICAL_REFERENCE_SYSTEMS = [
  "ngf_ign69",
  "ngf_ign78",
  "evrf2019",
  "evrf2019_mean_tide",
  "egm2008",
  "egm96",
  "msl",
  "dhhn2016",
  "nap",
  "odn",
  "ln02",
  "lhn95",
  "navd88",
  "ahd",
  "other_epsg",
  "local",
  "unknown",
] as const;

export const verticalReferenceSystemSchema = z.enum(VERTICAL_REFERENCE_SYSTEMS);

export type VerticalReferenceSystem = z.infer<
  typeof verticalReferenceSystemSchema
>;
