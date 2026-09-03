import type { Security } from "@projet-igsn/domain/sample/security/model";

import { describe, expect, it } from "vitest";

import {
  composeSecurity,
  type SecurityDraft,
  toSecurityDraft,
} from "./compose-security.ts";

const draft = (over: Partial<SecurityDraft>): SecurityDraft => ({
  ...toSecurityDraft(null),
  ...over,
});

const NO_HAZARD = {
  radioactivity: false,
  asbestosRich: false,
  chemicalRisk: false,
};

describe("composeSecurity", () => {
  it("should answer every hazard as absent for an untouched draft", () => {
    expect(composeSecurity(draft({}))).toEqual(NO_HAZARD);
  });

  it("should compose a declared hazard with its explanation", () => {
    expect(
      composeSecurity(
        draft({
          radioactivity: true,
          radioactivityExplanation: "3.2 kBq alpha",
        }),
      ),
    ).toEqual({
      ...NO_HAZARD,
      radioactivity: true,
      radioactivityExplanation: "3.2 kBq alpha",
    });
  });

  it("should drop the explanation left behind by a hazard switched off", () => {
    expect(
      composeSecurity(
        draft({
          asbestosRich: false,
          asbestosExplanation: "trace chrysotile",
        }),
      ),
    ).toEqual(NO_HAZARD);
  });

  it("should drop a blank explanation", () => {
    expect(
      composeSecurity(
        draft({ chemicalRisk: true, chemicalRiskExplanation: "   " }),
      ),
    ).toEqual({ ...NO_HAZARD, chemicalRisk: true });
  });

  it("should compose several independent hazards", () => {
    expect(
      composeSecurity(draft({ radioactivity: true, asbestosRich: true })),
    ).toEqual({ ...NO_HAZARD, radioactivity: true, asbestosRich: true });
  });
});

describe("toSecurityDraft", () => {
  it("should answer every hazard as absent for a null security", () => {
    expect(toSecurityDraft(null)).toEqual(NO_HAZARD);
  });

  it.each<Security>([
    {
      radioactivity: true,
      radioactivityExplanation: "3.2 kBq alpha",
      asbestosRich: false,
      chemicalRisk: true,
      chemicalRiskExplanation: "toxic metals",
    },
    {
      radioactivity: false,
      asbestosRich: true,
      asbestosExplanation: "10% amphibole",
      chemicalRisk: false,
    },
  ])("should round-trip through the draft", (security) => {
    expect(composeSecurity(toSecurityDraft(security))).toEqual(security);
  });
});
