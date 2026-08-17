import { z } from "zod";

export const VERTICAL_DATUMS = ["msl", "wgs84", "grs80"] as const;

export const verticalDatumSchema = z.enum(VERTICAL_DATUMS);

export type VerticalDatum = z.infer<typeof verticalDatumSchema>;
