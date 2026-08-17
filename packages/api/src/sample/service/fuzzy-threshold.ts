import { z } from "zod";

const DEFAULT_FUZZY_THRESHOLD = 0.8;

export const fuzzyThreshold: number = z.coerce
  .number()
  .gt(0)
  .max(1)
  .catch(DEFAULT_FUZZY_THRESHOLD)
  .parse(process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD);
