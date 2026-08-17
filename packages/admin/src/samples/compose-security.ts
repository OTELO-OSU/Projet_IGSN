import type { Security } from "@projet-igsn/domain/sample/security/model";

export type SecurityDraft = {
  radioactivity: "yes" | "no" | null | undefined;
  radioactivityExplanation: string | null | undefined;
  asbestosRich: "yes" | "no" | null | undefined;
  asbestosExplanation: string | null | undefined;
  chemicalRisk: "yes" | "no" | null | undefined;
  chemicalRiskExplanation: string | null | undefined;
};

const HAZARDS = [
  { flag: "radioactivity", explanation: "radioactivityExplanation" },
  { flag: "asbestosRich", explanation: "asbestosExplanation" },
  { flag: "chemicalRisk", explanation: "chemicalRiskExplanation" },
] as const;

type SecurityCandidate = {
  radioactivity: boolean | undefined;
  radioactivityExplanation: string | undefined;
  asbestosRich: boolean | undefined;
  asbestosExplanation: string | undefined;
  chemicalRisk: boolean | undefined;
  chemicalRiskExplanation: string | undefined;
};

export const isHazardDeclared = (
  answer: "yes" | "no" | null | undefined,
): boolean => answer === "yes";

const toBoolean = (
  answer: "yes" | "no" | null | undefined,
): boolean | undefined =>
  isHazardDeclared(answer) ? true : answer === "no" ? false : undefined;

export function composeSecurity(
  draft: SecurityDraft,
): SecurityCandidate | null {
  const security = {} as SecurityCandidate;
  for (const { flag, explanation } of HAZARDS) {
    const answered = toBoolean(draft[flag]);
    security[flag] = answered;
    security[explanation] = isHazardDeclared(draft[flag])
      ? draft[explanation]?.trim() || undefined
      : undefined;
  }
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
