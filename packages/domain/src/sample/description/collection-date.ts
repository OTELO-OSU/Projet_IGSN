import type { DateRange } from "../date-range.ts";

import { dateRangeSchema } from "../date-range.ts";

export const collectionDateSchema = dateRangeSchema("collection_date");

export type CollectionDate = DateRange;

export type { DatePrecision } from "../date-range.ts";
