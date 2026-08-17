import type { Security } from "@projet-igsn/domain/sample/security/model";

export function securityColumns(security: Security | null | undefined) {
  return {
    radioactivity: security?.radioactivity ?? null,
    radioactivity_explanation: security?.radioactivityExplanation ?? null,
    asbestos_rich: security?.asbestosRich ?? null,
    asbestos_explanation: security?.asbestosExplanation ?? null,
    chemical_risk: security?.chemicalRisk ?? null,
    chemical_risk_explanation: security?.chemicalRiskExplanation ?? null,
  };
}
