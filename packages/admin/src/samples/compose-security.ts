import type { Security } from "@projet-igsn/domain/sample/security/model";

// The Security section's flat form draft, mirroring the oriented/explanation
// seam in compose-description.ts: each hazard is a yes/no answer with an
// optional free-text explanation. Fields hold their value or nullish when unset.
export type SecurityDraft = {
  radioactivity: "yes" | "no" | null | undefined;
  radioactivityExplanation: string | null | undefined;
  asbestosRich: "yes" | "no" | null | undefined;
  asbestosExplanation: string | null | undefined;
  chemicalRisk: "yes" | "no" | null | undefined;
  chemicalRiskExplanation: string | null | undefined;
};

// The hazard flag paired with its explanation field, so compose and the draft
// mapping are one loop each (the same triples the domain schema refines over).
const HAZARDS = [
  { flag: "radioactivity", explanation: "radioactivityExplanation" },
  { flag: "asbestosRich", explanation: "asbestosExplanation" },
  { flag: "chemicalRisk", explanation: "chemicalRiskExplanation" },
] as const;

// A security as composed from the draft, before securitySchema judges it: the
// Security shape with possibly-missing parts. Compose only excludes values
// hidden behind the UI state (an explanation without a yes flag), since an
// error on a hidden field could never be fixed.
type SecurityCandidate = {
  radioactivity: boolean | undefined;
  radioactivityExplanation: string | undefined;
  asbestosRich: boolean | undefined;
  asbestosExplanation: string | undefined;
  chemicalRisk: boolean | undefined;
  chemicalRiskExplanation: string | undefined;
};

const toBoolean = (
  answer: "yes" | "no" | null | undefined,
): boolean | undefined =>
  answer === "yes" ? true : answer === "no" ? false : undefined;

export function composeSecurity(
  draft: SecurityDraft,
): SecurityCandidate | null {
  const security = {} as SecurityCandidate;
  for (const { flag, explanation } of HAZARDS) {
    const answered = toBoolean(draft[flag]);
    security[flag] = answered;
    // The explanation field is hidden unless the flag is yes, so a value
    // lingering after switching away is an unreachable leftover, not data.
    security[explanation] =
      answered === true ? draft[explanation]?.trim() || undefined : undefined;
  }
  // All parts unset means no security at all; undefined values are dropped by
  // JSON on the wire, so the stored shape stays minimal.
  return Object.values(security).some((part) => part !== undefined)
    ? security
    : null;
}

export function toSecurityDraft(
  security: Security | null | undefined,
): SecurityDraft {
  const draft = {} as SecurityDraft;
  for (const { flag, explanation } of HAZARDS) {
    draft[flag] =
      security?.[flag] == null ? undefined : security[flag] ? "yes" : "no";
    draft[explanation] = security?.[explanation] ?? undefined;
  }
  return draft;
}
