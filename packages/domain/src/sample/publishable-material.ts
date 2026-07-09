import { z } from "zod";

// Material types (root path segments) eligible for publication. The registry
// scope is the solid Earth, so `synthetic_rock_mineral` (man-made) and
// `extraterrestrial_rock` (not Earth) are omitted; nothing beneath an omitted
// root can be published. Every entry must be a real root of MATERIAL_PATHS
// (asserted in the spec).
export const PUBLISHABLE_MATERIAL_TYPES = [
  "rock",
  "sediment",
  "mineral",
  "fossil",
] as const;

export const publishableMaterialTypeSchema = z.enum(PUBLISHABLE_MATERIAL_TYPES);

export type PublishableMaterialType = z.infer<
  typeof publishableMaterialTypeSchema
>;
