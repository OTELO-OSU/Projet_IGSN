import { describe, expect, it } from "vitest";

import type { Sample } from "../sample.ts";

import { samplePublishBlockers } from "./sample-publish-blockers.ts";

const base: Sample = {
  id: "00000000-0000-7000-8000-000000000001",
  name: "Basalt 42",
  nature: "hand_sample",
  type: "individual_sample",
  material: "rock.igneous.plutonic.felsic.granite",
  texture: null,
  metamorphicFacies: null,
  collectionMethod: null,
  collectionMethodDescription: null,
  specificName: "BAS-42-001",
  location: { position: { type: "point", longitude: 0, latitude: 0 } },
  description: { collectionDate: { start: "2026-01-01", end: "2026-01-01" } },
  igsn: null,
  published: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("samplePublishBlockers", () => {
  it("should report no blockers when the type and material path are leaves", () => {
    expect(samplePublishBlockers(base)).toEqual([]);
  });

  it("should report type_missing when type is null", () => {
    expect(samplePublishBlockers({ ...base, type: null })).toEqual([
      "type_missing",
    ]);
  });

  it("should report type_incomplete when the type is an ancestor path", () => {
    expect(samplePublishBlockers({ ...base, type: "core" })).toEqual([
      "type_incomplete",
    ]);
  });

  it("should report both type and material blockers independently", () => {
    expect(
      samplePublishBlockers({ ...base, type: null, material: null }),
    ).toEqual(["type_missing", "material_missing"]);
  });

  it("should report material_missing when material is null", () => {
    expect(samplePublishBlockers({ ...base, material: null })).toEqual([
      "material_missing",
    ]);
  });

  it("should report material_incomplete when the path is an internal node", () => {
    expect(samplePublishBlockers({ ...base, material: "rock" })).toEqual([
      "material_incomplete",
    ]);
  });

  it("should report metamorphic_facies_missing for a metamorphic sample without a facies", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: null,
      }),
    ).toEqual(["metamorphic_facies_missing"]);
  });

  it("should not report metamorphic_facies_missing once the facies is set", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "amphibolite",
      }),
    ).toEqual([]);
  });

  it("should not require a facies for a non-metamorphic sample", () => {
    expect(samplePublishBlockers({ ...base, metamorphicFacies: null })).toEqual(
      [],
    );
  });

  it("should report metamorphic_facies_missing for an out-of-vocabulary facies", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "rock.metamorphic.strongly_metamorphosed.gneiss",
        metamorphicFacies: "bogus" as Sample["metamorphicFacies"],
      }),
    ).toEqual(["metamorphic_facies_missing"]);
  });

  it("should report a blocker for a value outside the vocabulary rather than treat it as publishable", () => {
    expect(
      samplePublishBlockers({
        ...base,
        type: "not_a_type",
        material: "not_a_material",
      }),
    ).toEqual(["type_incomplete", "material_incomplete"]);
  });

  it("should report location_position_missing when a required material has no position", () => {
    expect(samplePublishBlockers({ ...base, location: null })).toEqual([
      "location_position_missing",
    ]);
  });

  it("should report location_position_missing when a location has no position", () => {
    expect(
      samplePublishBlockers({
        ...base,
        location: { localityName: "Somewhere" },
      }),
    ).toEqual(["location_position_missing"]);
  });

  it("should not require a location for synthetic material", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "synthetic_rock_mineral",
        location: null,
      }),
    ).toEqual([]);
  });

  it("should not require a location for an extraterrestrial returned sample", () => {
    expect(
      samplePublishBlockers({
        ...base,
        material: "extraterrestrial_rock.returned_samples.other",
        location: null,
      }),
    ).toEqual([]);
  });

  it("should not add a location blocker while the material is still incomplete", () => {
    expect(
      samplePublishBlockers({ ...base, material: "rock", location: null }),
    ).toEqual(["material_incomplete"]);
  });
});
