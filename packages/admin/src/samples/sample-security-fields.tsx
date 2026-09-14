import { m } from "#/paraglide/messages.js";
import { useSampleForm } from "#/samples/use-sample-form.ts";

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

export function SampleSecurityFields() {
  const form = useSampleForm();
  return (
    <div className="grid gap-4">
      {hazards.map((hazard) => (
        <div key={hazard.flag} className="grid gap-4">
          <form.AppField name={`security.${hazard.flag}`}>
            {(field) => <field.SwitchField label={hazard.label()} />}
          </form.AppField>
          <form.Subscribe
            selector={(state) => state.values.security[hazard.flag]}
          >
            {(declared) =>
              declared ? (
                <form.AppField name={`security.${hazard.explanation}`}>
                  {(field) => (
                    <field.TextField
                      label={hazard.explanationLabel()}
                      multiline
                    />
                  )}
                </form.AppField>
              ) : null
            }
          </form.Subscribe>
        </div>
      ))}
    </div>
  );
}
