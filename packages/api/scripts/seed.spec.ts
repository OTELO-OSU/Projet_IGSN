import { describe, expect, it } from "vitest";

import { parseSeedSample, SEED_SAMPLES } from "./seed.ts";

const draft = {
  id: "00000000-0000-7000-8000-00000000000f",
  name: "Drift probe",
  nature: "hand_sample",
} as const;

describe("parseSeedSample", () => {
  // The fixture itself: any row drifting from its schema fails the suite,
  // not just the next seed run.
  it.each(SEED_SAMPLES.map((sample) => [sample.name, sample] as const))(
    "should accept the seed row %s",
    (_, sample) => {
      expect(() => parseSeedSample(sample)).not.toThrow();
    },
  );

  it("should reject a published row that is not publishable", () => {
    expect(() => parseSeedSample({ ...draft, published: true })).toThrow(
      /published schema/,
    );
  });

  it("should reject a draft row the create schema refuses", () => {
    // A synthetic material forbids a location (ADR 0014): only the create
    // schema knows, the persisted shape alone would let it through.
    expect(() =>
      parseSeedSample({
        ...draft,
        material: "synthetic_rock_mineral",
        location: {
          position: { type: "point", longitude: 2.35, latitude: 48.85 },
        },
      }),
    ).toThrow(/draft schema/);
  });

  it("should reject an out-of-vocabulary material", () => {
    expect(() =>
      parseSeedSample({ ...draft, material: "rock.made_up" }),
    ).toThrow();
  });
});
