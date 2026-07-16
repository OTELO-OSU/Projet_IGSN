import { z } from "zod";

// Reference surface for an elevation/bathymetry value: mean sea level, or the
// WGS84 / GRS80 ellipsoids. Labels are translated per app (see the label maps).
export const VERTICAL_DATUMS = ["msl", "wgs84", "grs80"] as const;

export const verticalDatumSchema = z.enum(VERTICAL_DATUMS);

export type VerticalDatum = z.infer<typeof verticalDatumSchema>;
