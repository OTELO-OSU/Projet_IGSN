import type { Description } from "@projet-igsn/domain/sample/description/model";

import { describe, expect, it } from "vitest";

import {
  composeDescription,
  type DescriptionDraft,
  toDescriptionDraft,
} from "./compose-description.ts";

const draft = (over: Partial<DescriptionDraft>): DescriptionDraft => ({
  ...toDescriptionDraft(null),
  ...over,
});

describe("composeDescription", () => {
  it("should return null for an empty draft", () => {
    expect(composeDescription(draft({}))).toBeNull();
  });

  it("should compose the mirrored degenerate range of a single date", () => {
    expect(
      composeDescription(
        draft({
          collectionDateStart: "2026-01-05",
          collectionDateEnd: "2026-01-05",
        }),
      ),
    ).toEqual({ collectionDate: { start: "2026-01-05", end: "2026-01-05" } });
  });

  it("should compose a range from its start and end", () => {
    expect(
      composeDescription(
        draft({
          collectionDateStart: "2026-01-05",
          collectionDateEnd: "2026-02-10",
        }),
      ),
    ).toEqual({
      collectionDate: { start: "2026-01-05", end: "2026-02-10" },
    });
  });

  it("should keep a half-filled range for the schema to reject", () => {
    expect(
      composeDescription(draft({ collectionDateStart: "2026-01-05" })),
    ).toEqual({ collectionDate: { start: "2026-01-05" } });
  });

  it("should compose an oriented sample with its explanation", () => {
    expect(
      composeDescription(
        draft({ oriented: "yes", orientationExplanation: "Marked north face" }),
      ),
    ).toEqual({ oriented: true, orientationExplanation: "Marked north face" });
  });

  it("should drop the explanation left behind when the sample is not oriented", () => {
    expect(
      composeDescription(
        draft({ oriented: "no", orientationExplanation: "Marked north face" }),
      ),
    ).toEqual({ oriented: false });
  });

  it("should drop the explanation when the orientation question is unanswered", () => {
    expect(
      composeDescription(
        draft({ orientationExplanation: "Marked north face" }),
      ),
    ).toBeNull();
  });

  it("should drop a blank open description", () => {
    expect(composeDescription(draft({ openDescription: "   " }))).toBeNull();
  });

  it("should compose a full measurement", () => {
    expect(
      composeDescription(draft({ lengthValue: 10, lengthUnit: "cm" })),
    ).toEqual({ length: { value: 10, unit: "cm" } });
  });

  it("should keep a value missing its unit for the schema to reject", () => {
    expect(composeDescription(draft({ massValue: 5 }))).toEqual({
      mass: { value: 5 },
    });
  });

  it("should keep a unit missing its value for the schema to reject", () => {
    expect(composeDescription(draft({ massUnit: "kg" }))).toEqual({
      mass: { unit: "kg" },
    });
  });
});

describe("toDescriptionDraft", () => {
  it("should return a draft with every field unset for a null description", () => {
    expect(toDescriptionDraft(null)).toEqual({});
  });

  it("should fill both range bounds from the stored collection date", () => {
    expect(
      toDescriptionDraft({
        collectionDate: { start: "2026-01-05", end: "2026-02-10" },
      }),
    ).toEqual({
      collectionDateStart: "2026-01-05",
      collectionDateEnd: "2026-02-10",
    });
  });

  it.each<Description>([
    {
      collectionDate: { start: "2026-01-05", end: "2026-01-05" },
      oriented: true,
      orientationExplanation: "Marked north face",
      openDescription: "Fine-grained basalt",
      length: { value: 10, unit: "cm" },
      width: { value: 5, unit: "cm" },
      thickness: { value: 20, unit: "mm" },
      mass: { value: 1.2, unit: "kg" },
      volume: { value: 250, unit: "cm3" },
    },
    {
      collectionDate: { start: "2026-01-05", end: "2026-02-10" },
      oriented: false,
    },
  ])("should round-trip through the draft", (description) => {
    expect(composeDescription(toDescriptionDraft(description))).toEqual(
      description,
    );
  });
});
