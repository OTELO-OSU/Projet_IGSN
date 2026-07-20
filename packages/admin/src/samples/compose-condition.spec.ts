import type { Condition } from "@projet-igsn/domain/sample/condition/model";

import { describe, expect, it } from "vitest";

import {
  composeCondition,
  type ConditionDraft,
  toConditionDraft,
} from "./compose-condition.ts";

const draft = (over: Partial<ConditionDraft>): ConditionDraft => ({
  ...toConditionDraft(null),
  ...over,
});

describe("composeCondition", () => {
  it("should return null for an empty draft", () => {
    expect(composeCondition(draft({}))).toBeNull();
  });

  it("should round-trip a full condition through the draft", () => {
    const condition: Condition = {
      packaging: "glass_bottle",
      storageConditions: ["temperature_controlled", "light_controlled"],
      temperature: {
        type: "frozen",
        measurement: { value: -18, unit: "celsius" },
      },
      humidity: { type: "controlled", percentage: 40 },
      light: "total_darkness",
      pressure: {
        type: "controlled_gas",
        measurement: { value: 1.2, unit: "bar" },
      },
      specificConditions: "Stored under argon",
    };
    expect(composeCondition(toConditionDraft(condition))).toEqual(condition);
  });

  it("should compose a category without its reading", () => {
    expect(composeCondition(draft({ temperatureType: "ambient" }))).toEqual({
      temperature: { type: "ambient", measurement: undefined },
    });
  });

  it("should keep a half-filled measurement for the schema to reject", () => {
    expect(
      composeCondition(draft({ pressureType: "vacuum", pressureValue: 0.5 })),
    ).toEqual({
      pressure: {
        type: "vacuum",
        measurement: { value: 0.5, unit: undefined },
      },
    });
  });

  it("should drop a reading left behind an unset category", () => {
    // The value and unit inputs are disabled while their category is unset,
    // so leftovers are uneditable and must not be submitted (ADR 0015).
    expect(
      composeCondition(
        draft({ temperatureValue: -18, temperatureUnit: "celsius" }),
      ),
    ).toBeNull();
  });

  it("should drop a percentage left behind an unset humidity", () => {
    expect(composeCondition(draft({ humidityPercentage: 40 }))).toBeNull();
  });

  it("should compose no storage conditions from an empty selection", () => {
    expect(composeCondition(draft({ storageConditions: [] }))).toBeNull();
  });

  it("should trim the specific conditions and drop them when blank", () => {
    expect(
      composeCondition(draft({ specificConditions: "  argon  " })),
    ).toEqual({ specificConditions: "argon" });
    expect(composeCondition(draft({ specificConditions: "   " }))).toBeNull();
  });
});

describe("toConditionDraft", () => {
  it("should map a null condition to an all-unset draft", () => {
    expect(toConditionDraft(null)).toEqual({
      packaging: undefined,
      storageConditions: [],
      temperatureType: undefined,
      temperatureValue: undefined,
      temperatureUnit: undefined,
      humidityType: undefined,
      humidityPercentage: undefined,
      light: undefined,
      pressureType: undefined,
      pressureValue: undefined,
      pressureUnit: undefined,
      specificConditions: undefined,
    });
  });
});
