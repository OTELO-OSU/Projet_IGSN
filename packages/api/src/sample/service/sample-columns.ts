import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { conditionColumns } from "./condition-columns.ts";
import { descriptionColumns } from "./description-columns.ts";
import { repositoryColumns } from "./repository-columns.ts";
import { resourceTypeColumns } from "./resource-type-columns.ts";
import { scientificContextColumns } from "./scientific-context-columns.ts";
import { securityColumns } from "./security-columns.ts";
import { syntheticDetailsColumns } from "./synthetic-details-columns.ts";
import { toAgeColumns } from "./to-age-columns.ts";

export const sampleColumns = (input: CreateSample) => ({
  name: input.name,
  nature: input.nature ?? null,
  type: input.type,
  material: input.material ?? null,
  material_other_name: input.materialOtherName ?? null,
  texture: input.texture ?? null,
  metamorphic_facies: input.metamorphicFacies ?? null,
  metamorphic_fabric: input.metamorphicFabric ?? null,
  collection_method: input.collectionMethod ?? null,
  collection_method_description: input.collectionMethodDescription ?? null,
  geological_context_description: input.geologicalContextDescription ?? null,
  geomorphological_environment: input.geomorphologicalEnvironment ?? null,
  specific_name: input.specificName ?? null,
  existence_status: input.existenceStatus ?? null,
  availability_status: input.availabilityStatus ?? null,
  ...descriptionColumns(input.description),
  ...conditionColumns(input.condition),
  ...scientificContextColumns(input.scientificContext),
  ...repositoryColumns(input.repository),
  ...syntheticDetailsColumns(input.syntheticDetails),
  ...toAgeColumns(input.age),
  ...securityColumns(input.security),
  ...resourceTypeColumns(input),
});
