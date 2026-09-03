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
    ).toEqual({
      collectionDate: {
        precision: "day",
        start: "2026-01-05",
        end: "2026-01-05",
      },
    });
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
      collectionDate: {
        precision: "day",
        start: "2026-01-05",
        end: "2026-02-10",
      },
    });
  });

  it("should compose an hour-precision range with its time zone", () => {
    expect(
      composeDescription(
        draft({
          collectionDatePrecision: "hour",
          collectionDateStart: "2026-01-05T08:30",
          collectionDateEnd: "2026-01-05T17:00",
          collectionDateTimeZone: "Europe/Paris",
        }),
      ),
    ).toEqual({
      collectionDate: {
        precision: "hour",
        start: "2026-01-05T08:30",
        end: "2026-01-05T17:00",
        timeZone: "Europe/Paris",
      },
    });
  });

  it("should drop the time zone left behind at day precision", () => {
    expect(
      composeDescription(
        draft({
          collectionDateStart: "2026-01-05",
          collectionDateEnd: "2026-01-05",
          collectionDateTimeZone: "Europe/Paris",
        }),
      ),
    ).toEqual({
      collectionDate: {
        precision: "day",
        start: "2026-01-05",
        end: "2026-01-05",
      },
    });
  });

  it("should keep a half-filled range for the schema to reject", () => {
    expect(
      composeDescription(draft({ collectionDateStart: "2026-01-05" })),
    ).toEqual({ collectionDate: { precision: "day", start: "2026-01-05" } });
  });

  it("should compose an oriented sample with its explanation", () => {
    expect(
      composeDescription(
        draft({ oriented: true, orientationExplanation: "Marked north face" }),
      ),
    ).toEqual({ oriented: true, orientationExplanation: "Marked north face" });
  });

  it("should state nothing for an unoriented sample, explanation left behind included", () => {
    expect(
      composeDescription(
        draft({ oriented: false, orientationExplanation: "Marked north face" }),
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

  it("should drop a unit left behind by a cleared value", () => {
    expect(composeDescription(draft({ massUnit: "kg" }))).toBeNull();
  });
});

describe("toDescriptionDraft", () => {
  it("should return an unoriented day-precision draft for a null description", () => {
    expect(toDescriptionDraft(null)).toEqual({
      collectionDatePrecision: "day",
      oriented: false,
    });
  });

  it("should fill both range bounds from the stored collection date", () => {
    expect(
      toDescriptionDraft({
        collectionDate: {
          precision: "day",
          start: "2026-01-05",
          end: "2026-02-10",
        },
      }),
    ).toEqual({
      collectionDatePrecision: "day",
      collectionDateStart: "2026-01-05",
      collectionDateEnd: "2026-02-10",
      oriented: false,
    });
  });

  it("should fill the precision and time zone from an hour-precision collection date", () => {
    expect(
      toDescriptionDraft({
        collectionDate: {
          precision: "hour",
          start: "2026-01-05T08:30",
          end: "2026-01-05T17:00",
          timeZone: "Europe/Paris",
        },
      }),
    ).toEqual({
      collectionDatePrecision: "hour",
      collectionDateStart: "2026-01-05T08:30",
      collectionDateEnd: "2026-01-05T17:00",
      collectionDateTimeZone: "Europe/Paris",
      oriented: false,
    });
  });

  it.each<Description>([
    {
      collectionDate: {
        precision: "day",
        start: "2026-01-05",
        end: "2026-01-05",
      },
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
      collectionDate: {
        precision: "hour",
        start: "2026-01-05T08:30",
        end: "2026-02-10T17:00",
        timeZone: "Europe/Paris",
      },
      openDescription: "Fine-grained basalt",
    },
  ])("should round-trip through the draft", (description) => {
    expect(composeDescription(toDescriptionDraft(description))).toEqual(
      description,
    );
  });
});
