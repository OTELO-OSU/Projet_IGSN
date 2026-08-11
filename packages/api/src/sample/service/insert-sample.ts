import type { InstitutionalGroups } from "@projet-igsn/domain/institutional-group/model";
import type { CreateSample, Sample } from "@projet-igsn/domain/sample/sample";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import { conditionColumns } from "./condition-columns.ts";
import { descriptionColumns } from "./description-columns.ts";
import { economicInterestColumns } from "./economic-interest-columns.ts";
import { getSampleById } from "./get-sample-by-id.ts";
import { replaceSampleLinks } from "./replace-sample-links.ts";
import { scientificContextColumns } from "./scientific-context-columns.ts";
import { securityColumns } from "./security-columns.ts";
import { toAgeColumns } from "./to-age-columns.ts";
import { locationColumns } from "./to-location.ts";

export async function insertSample(
  db: Transactional<DB>,
  input: CreateSample,
  groups?: InstitutionalGroups,
): Promise<Sample> {
  const row = await db
    .insertInto("sample")
    .values({
      id: uuidv7(),
      name: input.name,
      nature: input.nature,
      type: input.type,
      material: input.material ?? null,
      texture: input.texture ?? null,
      metamorphic_facies: input.metamorphicFacies ?? null,
      collection_method: input.collectionMethod ?? null,
      collection_method_description: input.collectionMethodDescription ?? null,
      specific_name: input.specificName ?? null,
      availability: input.availability ?? null,
      institutional_organization: groups?.institutionalOrganization ?? null,
      institutional_osu: groups?.institutionalOsu ?? null,
      institutional_laboratory: groups?.institutionalLaboratory ?? null,
      ...descriptionColumns(input.description),
      ...locationColumns(input.location),
      ...conditionColumns(input.condition),
      ...scientificContextColumns(input.scientificContext),
      ...toAgeColumns(input.age),
      ...securityColumns(input.security),
      ...economicInterestColumns(input),
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  await replaceSampleLinks(db, row.id, input.links ?? []);
  return getSampleById(db, row.id);
}
