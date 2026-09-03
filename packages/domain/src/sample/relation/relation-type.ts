import { z } from "zod";

export const RELATION_TYPES = [
  "is_cited_by",
  "is_referenced_by",
  "references",
  "is_described_by",
  "documents",
  "has_metadata",
  "is_part_of",
  "has_part",
  "is_derived_from",
  "is_source_of",
  "is_identical_to",
  "is_collected_by",
  "other",
] as const;

export const relationTypeSchema = z.enum(RELATION_TYPES);

export type RelationType = z.infer<typeof relationTypeSchema>;

export const hasMetadataScheme = (relationType: RelationType | ""): boolean =>
  relationType === "has_metadata";
