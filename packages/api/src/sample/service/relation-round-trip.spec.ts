import { describe, expect } from "vitest";

import { listAsOwner } from "../../tests/list-as-owner.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { readSample } from "../../tests/read-sample.ts";
import { insertSample } from "./insert-sample.ts";
import { updateSample } from "./update-sample.ts";

const base = {
  name: "Related sample",
  nature: "hand_sample" as const,
  type: null,
};

const fullRelation = {
  relationType: "has_metadata" as const,
  identifierType: "doi" as const,
  identifier: "https://doi.org/10.1594/IEDA.100252",
  targetTitle: "IEDA companion dataset",
  targetResourceType: "dataset" as const,
  relationTypeInformation: "Described by the IEDA schema",
  relatedMetadataScheme: "DataCite",
  schemeURI: "https://schema.datacite.org/meta/kernel-4.6/",
  schemeType: "XSD",
  description: "Related IEDA dataset",
};

const minimalRelation = {
  relationType: "other" as const,
  identifierType: "url" as const,
  identifier: "https://example.com/paper",
  targetTitle: "A related paper",
};

const persistedMinimal = {
  ...minimalRelation,
  targetResourceType: null,
  relationTypeInformation: null,
  relatedMetadataScheme: null,
  schemeURI: null,
  schemeType: null,
  description: null,
};

describe("sample relations persistence", () => {
  pgTest("should round-trip relations in entry order", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      relations: [fullRelation, minimalRelation],
    });
    expect(created.relations).toMatchObject([fullRelation, persistedMinimal]);
    expect(await readSample(db, created.id)).toEqual(created);
  });

  pgTest("should create a sample without relations", async ({ db }) => {
    const created = await insertSample(db, base);
    expect(created.relations).toEqual([]);
  });

  pgTest("should replace the relations wholesale on update", async ({ db }) => {
    const created = await insertSample(db, {
      ...base,
      relations: [fullRelation],
    });
    const updated = await updateSample(db, created.id, {
      ...base,
      relations: [minimalRelation],
    });
    expect(updated?.relations).toMatchObject([persistedMinimal]);
  });

  pgTest(
    "should clear the relations when the update carries none",
    async ({ db }) => {
      const created = await insertSample(db, {
        ...base,
        relations: [fullRelation],
      });
      const updated = await updateSample(db, created.id, base);
      expect(updated?.relations).toEqual([]);
      expect((await readSample(db, created.id))?.relations).toEqual([]);
    },
  );

  pgTest("should list each sample with its own relations", async ({ db }) => {
    const first = await insertSample(db, {
      ...base,
      name: "First",
      relations: [minimalRelation],
    });
    const second = await insertSample(db, { ...base, name: "Second" });
    const { data } = await listAsOwner(db, { page: 1, perPage: 10 });
    const byId = new Map(data.map((sample) => [sample.id, sample]));
    expect(byId.get(first.id)?.relations).toMatchObject([persistedMinimal]);
    expect(byId.get(second.id)?.relations).toEqual([]);
  });
});
