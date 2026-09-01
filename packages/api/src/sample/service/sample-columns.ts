import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { conditionColumns } from "./condition-columns.ts";
import { descriptionColumns } from "./description-columns.ts";
import { resourceTypeColumns } from "./resource-type-columns.ts";
import { scientificContextColumns } from "./scientific-context-columns.ts";
import { securityColumns } from "./security-columns.ts";
import { toAgeColumns } from "./to-age-columns.ts";
import { locationColumns } from "./to-location.ts";

export const sampleColumns = (input: CreateSample) => ({
  name: input.name,
  nature: input.nature,
  type: input.type,
  material: input.material ?? null,
  texture: input.texture ?? null,
  metamorphic_facies: input.metamorphicFacies ?? null,
  collection_method: input.collectionMethod ?? null,
  collection_method_description: input.collectionMethodDescription ?? null,
  specific_name: input.specificName ?? null,
  existence_status: input.existenceStatus ?? null,
  availability_status: input.availabilityStatus ?? null,
  ...descriptionColumns(input.description),
  ...locationColumns(input.location),
  ...conditionColumns(input.condition),
  ...scientificContextColumns(input.scientificContext),
  ...toAgeColumns(input.age),
  ...securityColumns(input.security),
  ...resourceTypeColumns(input),
});
