import { z } from "zod";

// `unknown_origin` is a real recorded answer, distinct from "not filled".
export const COLLECTION_ORIGINS = [
  "scientific_expedition",
  "purchase",
  "constitution",
  "inheritance",
  "unknown_origin",
  "other",
] as const;

export const collectionOriginSchema = z.enum(COLLECTION_ORIGINS);

export type CollectionOrigin = z.infer<typeof collectionOriginSchema>;
