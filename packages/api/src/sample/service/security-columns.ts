import type { Security } from "@projet-igsn/domain/sample/security/model";

// Domain security -> flat sample columns (same pattern as the condition,
// ADR 0016), shared by insert and update. A null/absent security writes null
// everywhere, so an update clears what the input no longer carries.
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
