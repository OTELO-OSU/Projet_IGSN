import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { collaboratorRoleSchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { Selectable } from "kysely";

import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { publishedEditSchema } from "@projet-igsn/domain/sample/publication/published-sample-schema";
import { publishBlockerSchema } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import {
  createSampleSchema,
  sampleSchema,
  sampleStatusSchema,
} from "@projet-igsn/domain/sample/sample";
import { z } from "zod";

import type { DB } from "../src/db.ts";

export const sampleRowSchema = sampleSchema
  .pick({
    id: true,
    name: true,
    nature: true,
    type: true,
    material: true,
    texture: true,
    metamorphicFacies: true,
    metamorphicFabric: true,
    collectionMethod: true,
    collectionMethodDescription: true,
    geologicalContextDescription: true,
    physiographicEnvironment: true,
    specificName: true,
    location: true,
    description: true,
    existenceStatus: true,
    availabilityStatus: true,
    scientificContext: true,
    repository: true,
    condition: true,
    syntheticDetails: true,
    age: true,
    mineralClassifications: true,
    igsn: true,
    synchronizationStatus: true,
    synchronizationError: true,
  })
  .partial({
    type: true,
    material: true,
    texture: true,
    metamorphicFacies: true,
    metamorphicFabric: true,
    collectionMethod: true,
    collectionMethodDescription: true,
    geologicalContextDescription: true,
    physiographicEnvironment: true,
    specificName: true,
    location: true,
    description: true,
    existenceStatus: true,
    availabilityStatus: true,
    scientificContext: true,
    repository: true,
    condition: true,
    syntheticDetails: true,
    age: true,
    igsn: true,
    synchronizationStatus: true,
    synchronizationError: true,
  })
  .extend({
    status: sampleStatusSchema.default("draft"),
    existingBlockers: z.array(publishBlockerSchema).optional(),
  });

export type SampleRow = z.input<typeof sampleRowSchema>;

export type SampleOwner = InstitutionalGroups & {
  id: string;
  manualGroups: string[];
};

export type OwnedSampleRow = SampleRow & {
  owner: SampleOwner;
  collaborators?: {
    userId: string;
    role: z.infer<typeof collaboratorRoleSchema>;
  }[];
};

export type CreatedSample = Pick<
  Selectable<DB["sample"]>,
  "id" | "name" | "specific_name" | "nature" | "igsn" | "status"
>;

export function parseSampleRow(
  row: SampleRow,
): z.output<typeof sampleRowSchema> {
  const parsed = sampleRowSchema.parse(row);
  const {
    id: _id,
    igsn: _igsn,
    status,
    synchronizationStatus: _synchronizationStatus,
    synchronizationError: _synchronizationError,
    existingBlockers,
    ...create
  } = parsed;
  const wasPublished = hasPermanentIgsn({ status });
  const result = (
    wasPublished
      ? publishedEditSchema(existingBlockers ?? [])
      : createSampleSchema
  ).safeParse(create);
  if (!result.success) {
    throw new Error(
      `seed row "${parsed.name}" fails its ${wasPublished ? "published" : "draft"} schema: ${result.error.message}`,
    );
  }
  return parsed;
}
