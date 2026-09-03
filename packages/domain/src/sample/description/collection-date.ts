import { z } from "zod";

import { timeZoneSchema } from "../../date/time-zone.ts";
import { dateRangeIssues } from "../date-range.ts";

const localDateTimeSchema = z.iso
  .datetime({ local: true, precision: -1 })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

export const collectionDateSchema = z
  .discriminatedUnion("precision", [
    z.object({
      precision: z.literal("day"),
      start: z.iso.date(),
      end: z.iso.date(),
    }),
    z.object({
      precision: z.literal("hour"),
      start: localDateTimeSchema,
      end: localDateTimeSchema,
      timeZone: timeZoneSchema,
    }),
  ])
  .superRefine(dateRangeIssues("collection_date"));

export type CollectionDate = z.infer<typeof collectionDateSchema>;

export type DatePrecision = CollectionDate["precision"];
