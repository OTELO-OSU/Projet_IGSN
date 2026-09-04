import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { Kysely } from "kysely";

import type { DB } from "../db.ts";

export const draft = {
  name: "Basalte du Massif Central",
  nature: "thin_section" as const,
  type: null,
  collectionMethod: null,
} satisfies CreateSample;

export const publishableSample = {
  ...draft,
  type: "individual_sample",
  material: "sediment.exogenous_detritic.clay",
  location: {
    position: { type: "point" as const, longitude: 3, latitude: 45 },
  },
  description: {
    collectionDate: { start: "2026-01-01", end: "2026-01-01" },
  },
  existenceStatus: "exists" as const,
  availabilityStatus: "available" as const,
  scientificContext: {
    provenanceStatus: "collection_specimen" as const,
    collectionCurator: "Georges Cuvier",
    collectionOrigin: "scientific_expedition" as const,
  },
  repository: {
    currentArchive: "02feahw73",
  },
} satisfies CreateSample;

export const attachGroup = (
  db: Kysely<DB>,
  sampleId: string,
  groupId: string,
) =>
  db
    .insertInto("sample_manual_group")
    .values({ sample_id: sampleId, group_id: groupId })
    .execute();
