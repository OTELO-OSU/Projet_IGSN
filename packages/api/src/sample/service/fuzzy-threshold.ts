import { z } from "zod";

// At 0.8 "achondrites"/"Stony Achondrite" (0.833) matches and the neighbouring
// "chondrites" (0.750) does not. See ADR 0018.
const DEFAULT_FUZZY_THRESHOLD = 0.8;

export const fuzzyThreshold: number = z.coerce
  .number()
  .gt(0)
  .max(1)
  .catch(DEFAULT_FUZZY_THRESHOLD)
  .parse(process.env.SAMPLE_SEARCH_FUZZY_THRESHOLD);
