import { describe, expect, it } from "vitest";

import type { Sample } from "../sample.ts";

import {
  CORE_RECORD_FIXTURES,
  FRONTEND_URL,
  hydrate,
} from "./core-record-fixture.ts";
import {
  CORE_SAMPLE_FIXTURES,
  SERIES_MEMBER_SAMPLE,
  SERIES_SAMPLE,
} from "./core-sample-variant-fixture.ts";
import { toCoreSample } from "./to-core-sample.ts";

const UNMAPPED_SAMPLE_FIELDS = [
  "id",
  "igsn",
  "doiPrefix",
  "internalNumber",
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
  children: sample.children.map((child) => omit(child, UNMAPPED_PARENT_FIELDS)),
  series: sample.series && omit(sample.series, UNMAPPED_PARENT_FIELDS),
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

describe("a series of samples mapped to Core", () => {
  it("should emit a HasPart relation per child", () => {
    expect(
      toCoreSample(SERIES_SAMPLE, FRONTEND_URL)
        .relations?.filter((relation) => relation.relationType === "HasPart")
        .map((relation) => relation.targetIdentifier.value),
    ).toEqual(["0123456789ABCDEFGHJKMNPQRT", "CNRS1234567893"]);
  });
});

describe("a series member mapped to Core", () => {
  const isPartOf = (sample: Sample) =>
    toCoreSample(sample, FRONTEND_URL).relations?.filter(
      (relation) => relation.relationType === "IsPartOf",
    );

  it("should emit an IsPartOf relation naming its series", () => {
    expect(isPartOf(SERIES_MEMBER_SAMPLE)).toMatchObject([
      {
        targetIdentifier: { value: "0123456789ABCDEFGHJKMNPQRV" },
        targetTitles: [{ value: "Core series of the Nancy quarry" }],
      },
    ]);
  });

  it("should emit no IsPartOf relation while its series has no IGSN", () => {
    expect(
      isPartOf({
        ...SERIES_MEMBER_SAMPLE,
        series: { ...SERIES_MEMBER_SAMPLE.series!, igsn: null },
      }),
    ).toEqual([]);
  });
});
