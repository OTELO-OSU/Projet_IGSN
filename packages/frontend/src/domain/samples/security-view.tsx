import type { Security } from "@projet-igsn/domain/sample/security/model";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { m } from "#/paraglide/messages.js";

// A hazard flag rendered as Yes/No, or nothing when unanswered.
const hazardText = (flag: boolean | null | undefined) =>
  flag == null ? null : flag ? m.sample_hazard_yes() : m.sample_hazard_no();

// The security rows of the sample detail page; FieldRow drops the parts the
// sample lacks (every hazard is optional; the parent hides the whole section
// when the sample has none).
export function SecurityView({ security }: { security: Security }) {
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_radioactivity()}
        value={hazardText(security.radioactivity)}
      />
      <FieldRow
        label={m.sample_field_radioactivity_explanation()}
        value={security.radioactivityExplanation}
      />
      <FieldRow
        label={m.sample_field_asbestos_rich()}
        value={hazardText(security.asbestosRich)}
      />
      <FieldRow
        label={m.sample_field_asbestos_explanation()}
        value={security.asbestosExplanation}
      />
      <FieldRow
        label={m.sample_field_chemical_risk()}
        value={hazardText(security.chemicalRisk)}
      />
      <FieldRow
        label={m.sample_field_chemical_risk_explanation()}
        value={security.chemicalRiskExplanation}
      />
    </FieldRows>
  );
}
