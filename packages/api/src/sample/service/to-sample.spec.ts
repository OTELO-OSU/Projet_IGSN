import { describe, expect, it } from "vitest";

import { toSample } from "./to-sample.ts";

const row = {
  id: "018f4d3a-1f2b-7c00-8000-000000000000",
  name: "Grès de Fontainebleau",
  nature: "rock_powder",
  type: "dredge",
  material: "rock.igneous.plutonic.felsic.granite",
  texture: "phaneritic",
  collection_method: "coring.gravity_corer",
  specific_name: "FTB-2026-042",
  igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
  published: false,
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-06-01T00:00:00.000Z"),
};

describe("toSample", () => {
  it("should map a db row to a domain Sample with camelCase fields", () => {
    // Act
    const sample = toSample(row);
    // Assert
    expect(sample).toEqual({
      id: "018f4d3a-1f2b-7c00-8000-000000000000",
      name: "Grès de Fontainebleau",
      nature: "rock_powder",
      type: "dredge",
      material: "rock.igneous.plutonic.felsic.granite",
      texture: "phaneritic",
      collectionMethod: "coring.gravity_corer",
      specificName: "FTB-2026-042",
      igsn: "01K072TVWVFK5A1RRZ5MY4PPK9",
      published: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
  });

  it("should throw when the nature is not a known value", () => {
    expect(() => toSample({ ...row, nature: "inconnu" })).toThrow();
  });

  it("should throw when the type is not a known taxonomy path", () => {
    expect(() => toSample({ ...row, type: "half_round" })).toThrow();
  });

  it("should throw when the collection method is not a known taxonomy path", () => {
    expect(() =>
      toSample({ ...row, collection_method: "gravity_corer" }),
    ).toThrow();
  });

  it("should throw when the name is empty", () => {
    expect(() => toSample({ ...row, name: "" })).toThrow();
  });

  it("should throw when the id is not a uuid", () => {
    expect(() => toSample({ ...row, id: "pas-un-uuid" })).toThrow();
  });
});
