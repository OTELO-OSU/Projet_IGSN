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

describe("composeSecurity", () => {
  it("should return null for an empty draft", () => {
    expect(composeSecurity(draft({}))).toBeNull();
  });

  it("should compose a declared hazard with its explanation", () => {
    expect(
      composeSecurity(
        draft({
          radioactivity: "yes",
          radioactivityExplanation: "3.2 kBq alpha",
        }),
      ),
    ).toEqual({
      radioactivity: true,
      radioactivityExplanation: "3.2 kBq alpha",
    });
  });

  it("should drop the explanation left behind when the hazard is answered no", () => {
    expect(
      composeSecurity(
        draft({
          asbestosRich: "no",
          asbestosExplanation: "trace chrysotile",
        }),
      ),
    ).toEqual({ asbestosRich: false });
  });

  it("should drop the explanation when the hazard question is unanswered", () => {
    expect(
      composeSecurity(draft({ chemicalRiskExplanation: "toxic metals" })),
    ).toBeNull();
  });

  it("should drop a blank explanation", () => {
    expect(
      composeSecurity(
        draft({ chemicalRisk: "yes", chemicalRiskExplanation: "   " }),
      ),
    ).toEqual({ chemicalRisk: true });
  });

  it("should compose several independent hazards", () => {
    expect(
      composeSecurity(
        draft({ radioactivity: "yes", asbestosRich: "no", chemicalRisk: "no" }),
      ),
    ).toEqual({
      radioactivity: true,
      asbestosRich: false,
      chemicalRisk: false,
    });
  });
});

describe("toSecurityDraft", () => {
  it("should return a draft with every field unset for a null security", () => {
    expect(toSecurityDraft(null)).toEqual({});
  });

  it.each<Security>([
    {
      radioactivity: true,
      radioactivityExplanation: "3.2 kBq alpha",
      asbestosRich: false,
      chemicalRisk: true,
      chemicalRiskExplanation: "toxic metals",
    },
    { asbestosRich: true, asbestosExplanation: "10% amphibole" },
  ])("should round-trip through the draft", (security) => {
    expect(composeSecurity(toSecurityDraft(security))).toEqual(security);
  });
});
