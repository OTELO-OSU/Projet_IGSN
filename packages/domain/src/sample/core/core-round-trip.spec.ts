import { describe, expect, it } from "vitest";

import type { Sample } from "../sample.ts";

import {
  CORE_RECORD_FIXTURES,
  FRONTEND_URL,
  hydrate,
} from "./core-record-fixture.ts";
import { CORE_SAMPLE_FIXTURES } from "./core-sample-variant-fixture.ts";
import { toCoreSample } from "./to-core-sample.ts";

const UNMAPPED_SAMPLE_FIELDS = [
  "id",
  "igsn",
  "doiPrefix",
  "status",
  "createdAt",
  "publishedAt",
  "updatedAt",
  "owner",
  "institutionalOrganization",
  "institutionalOsu",
  "institutionalLaboratory",
  "attachments",
  "publicationYear",
  "localIdDescription",
];

const UNMAPPED_RELATION_FIELDS = ["id"];

const UNMAPPED_PARENT_FIELDS = ["id", "material"];

const omit = (value: object, fields: readonly string[]) =>
  Object.fromEntries(
    Object.entries(value).filter(([field]) => !fields.includes(field)),
  );

const mapped = (sample: Sample) => ({
  ...omit(sample, UNMAPPED_SAMPLE_FIELDS),
  relations: sample.relations.map((relation) =>
    omit(relation, UNMAPPED_RELATION_FIELDS),
  ),
  parents: sample.parents.map((parent) => omit(parent, UNMAPPED_PARENT_FIELDS)),
});

describe("a sample mapped to Core and back", () => {
  it.each(CORE_SAMPLE_FIXTURES)(
    "should restore $name but for its unmapped fields",
    (sample) => {
      expect(mapped(hydrate(toCoreSample(sample, FRONTEND_URL)))).toEqual(
        mapped(sample),
      );
    },
  );
});

describe("a Core record mapped to a sample and back", () => {
  it.each(CORE_RECORD_FIXTURES)(
    "should restore the Core record of $name",
    ({ record }) => {
      expect(toCoreSample(hydrate(record), FRONTEND_URL)).toEqual(record);
    },
  );
});
