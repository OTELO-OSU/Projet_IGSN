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
      storageConditions: [
        "temperature_controlled",
        "pressure_controlled",
        "moisture_controlled",
        "light_controlled",
      ],
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
    expect(
      composeCondition(
        draft({
          storageConditions: ["temperature_controlled"],
          temperatureType: "ambient",
        }),
      ),
    ).toEqual({
      storageConditions: ["temperature_controlled"],
      temperature: { type: "ambient", measurement: undefined },
    });
  });

  it("should keep a half-filled measurement for the schema to reject", () => {
    expect(
      composeCondition(
        draft({
          storageConditions: ["pressure_controlled"],
          pressureType: "vacuum",
          pressureValue: 0.5,
        }),
      ),
    ).toEqual({
      storageConditions: ["pressure_controlled"],
      pressure: {
        type: "vacuum",
        measurement: { value: 0.5, unit: undefined },
      },
    });
  });

  it("should drop a reading unit left behind by a cleared value", () => {
    expect(
      composeCondition(
        draft({
          storageConditions: ["pressure_controlled"],
          pressureType: "vacuum",
          pressureUnit: "bar",
        }),
      ),
    ).toEqual({
      storageConditions: ["pressure_controlled"],
      pressure: { type: "vacuum", measurement: undefined },
    });
  });

  it("should drop a reading whose storage condition is unchecked", () => {
    expect(
      composeCondition(
        draft({
          storageConditions: [],
          temperatureType: "frozen",
          temperatureValue: -18,
          temperatureUnit: "celsius",
          humidityType: "dry",
          light: "total_darkness",
        }),
      ),
    ).toBeNull();
  });

  it("should drop a reading left behind an unset category", () => {
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
