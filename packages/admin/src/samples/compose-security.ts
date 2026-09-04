import type { Security } from "@projet-igsn/domain/sample/security/model";

export type SecurityDraft = {
  radioactivity: boolean;
  radioactivityExplanation: string | null | undefined;
  asbestosRich: boolean;
  asbestosExplanation: string | null | undefined;
  chemicalRisk: boolean;
  chemicalRiskExplanation: string | null | undefined;
};

const HAZARDS = [
  { flag: "radioactivity", explanation: "radioactivityExplanation" },
  { flag: "asbestosRich", explanation: "asbestosExplanation" },
  { flag: "chemicalRisk", explanation: "chemicalRiskExplanation" },
] as const;

type SecurityCandidate = {
  radioactivity: boolean;
  radioactivityExplanation: string | undefined;
  asbestosRich: boolean;
  asbestosExplanation: string | undefined;
  chemicalRisk: boolean;
  chemicalRiskExplanation: string | undefined;
};

export function composeSecurity(draft: SecurityDraft): SecurityCandidate {
  const security = {} as SecurityCandidate;
  for (const { flag, explanation } of HAZARDS) {
    security[flag] = draft[flag];
    security[explanation] = draft[flag]
      ? draft[explanation]?.trim() || undefined
      : undefined;
  }
  return security;
}

export function toSecurityDraft(
  security: Security | null | undefined,
): SecurityDraft {
  const draft = {} as SecurityDraft;
  for (const { flag, explanation } of HAZARDS) {
    draft[flag] = security?.[flag] ?? false;
    draft[explanation] = security?.[explanation] ?? undefined;
  }
  return draft;
}
