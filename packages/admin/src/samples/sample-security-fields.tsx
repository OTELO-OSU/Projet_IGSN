import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";

import { m } from "#/paraglide/messages.js";
import { type SecurityDraft } from "#/samples/compose-security.ts";

const yesNoItems = [
  { value: "yes", label: m.hazard_yes() },
  { value: "no", label: m.hazard_no() },
];

// One safety hazard: its yes/no flag and the explanation shown once declared.
// The same triples the domain schema refines over (see security/model.ts).
const hazards = [
  {
    flag: "radioactivity",
    explanation: "radioactivityExplanation",
    label: m.field_radioactivity,
    explanationLabel: m.field_radioactivity_explanation,
  },
  {
    flag: "asbestosRich",
    explanation: "asbestosExplanation",
    label: m.field_asbestos_rich,
    explanationLabel: m.field_asbestos_explanation,
  },
  {
    flag: "chemicalRisk",
    explanation: "chemicalRiskExplanation",
    label: m.field_chemical_risk,
    explanationLabel: m.field_chemical_risk_explanation,
  },
] as const;

// The Security section. Every hazard is optional and independent; its
// explanation is disabled until the hazard is answered yes. Render inside a
// `form.AppForm`. The form store holds the flat `security.*` draft (so a value
// typed then disabled is kept while editing); `composeSecurity` drops any
// explanation whose flag is not yes on submit.
export function SampleSecurityFields() {
  const form = useTypedAppFormContext({
    defaultValues: {} as { security: SecurityDraft },
  });
  return (
    <div className="grid gap-4">
      {hazards.map((hazard) => (
        <div key={hazard.flag} className="grid gap-4">
          <form.AppField name={`security.${hazard.flag}`}>
            {(field) => (
              <field.ComboboxField
                label={hazard.label()}
                items={yesNoItems}
                placeholder={m.hazard_placeholder()}
                searchPlaceholder={m.hazard_search_placeholder()}
                emptyText={m.hazard_empty()}
              />
            )}
          </form.AppField>
          <form.Subscribe
            selector={(state) => state.values.security[hazard.flag] === "yes"}
          >
            {(declared) => (
              <form.AppField name={`security.${hazard.explanation}`}>
                {(field) => (
                  <field.TextField
                    label={hazard.explanationLabel()}
                    multiline
                    disabled={!declared}
                  />
                )}
              </form.AppField>
            )}
          </form.Subscribe>
        </div>
      ))}
    </div>
  );
}
