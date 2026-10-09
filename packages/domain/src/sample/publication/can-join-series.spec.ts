import { describe, expect, it } from "vitest";

import type { SampleStatus } from "../sample.ts";

import { canJoinSeries } from "./can-join-series.ts";

const PARENT = {
  id: "6b2d3c4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  igsn: "CNRS1234567892",
  name: "Rhyolite 12",
  material: null,
};

const member = {
  status: "published" as SampleStatus,
  type: "core",
  parents: [],
};

describe("canJoinSeries", () => {
  it.each([
    ["published", true],
    ["withdrawn", true],
    ["embargo", true],
    ["draft", false],
    ["tombstone", false],
  ] as const)("should answer %s with %s", (status, expected) => {
    expect(canJoinSeries({ ...member, status })).toBe(expected);
  });

  it("should refuse a sub-sample", () => {
    expect(canJoinSeries({ ...member, parents: [PARENT] })).toBe(false);
  });

  it("should refuse a series of samples", () => {
    expect(canJoinSeries({ ...member, type: "serie_of_sample.core" })).toBe(
      false,
    );
  });
});
