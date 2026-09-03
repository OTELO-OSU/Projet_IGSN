import type { CreateSampleRelation } from "@projet-igsn/domain/sample/relation/model";

import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";

export async function replaceSampleRelations(
  db: Transactional<DB>,
  sampleId: string,
  relations: CreateSampleRelation[],
): Promise<void> {
  await db
    .deleteFrom("sample_relation")
    .where("sample_id", "=", sampleId)
    .execute();
  if (relations.length === 0) return;
  await db
    .insertInto("sample_relation")
    .values(
      relations.map((relation) => ({
        id: uuidv7(),
        sample_id: sampleId,
        relation_type: relation.relationType,
        identifier_type: relation.identifierType,
        identifier: relation.identifier,
        target_title: relation.targetTitle,
        target_resource_type: relation.targetResourceType ?? null,
        relation_type_information: relation.relationTypeInformation ?? null,
        related_metadata_scheme: relation.relatedMetadataScheme ?? null,
        scheme_uri: relation.schemeURI ?? null,
        scheme_type: relation.schemeType ?? null,
        description: relation.description ?? null,
      })),
    )
    .execute();
}
