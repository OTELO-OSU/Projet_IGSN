import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import {
  PRESSURE_UNITS,
  pressureUnitLabel,
} from "@projet-igsn/domain/sample/condition/pressure-unit";
import {
  TEMPERATURE_UNITS,
  temperatureUnitLabel,
} from "@projet-igsn/domain/sample/condition/temperature-unit";
import {
  EXPERIMENT_DURATION_UNITS,
  experimentDurationUnitLabel,
} from "@projet-igsn/domain/sample/synthetic-details/experiment-duration-unit";
import { EXPERIMENT_TYPES } from "@projet-igsn/domain/sample/synthetic-details/experiment-type";
import { FINAL_PRODUCTS } from "@projet-igsn/domain/sample/synthetic-details/final-product";
import { needsStartingMaterialComposition } from "@projet-igsn/domain/sample/synthetic-details/needs-starting-material-composition";
import { STARTING_MATERIALS } from "@projet-igsn/domain/sample/synthetic-details/starting-material";
import { STARTING_MATERIAL_NATURES } from "@projet-igsn/domain/sample/synthetic-details/starting-material-nature";

import { m } from "#/paraglide/messages.js";
import { DateRangeField } from "#/samples/date-range-field.tsx";
import { MeasurementFieldPair } from "#/samples/measurement-fields.tsx";
import { organizationItems } from "#/samples/organization-items.ts";
import {
  experimentTypeLabel,
  finalProductLabel,
  startingMaterialNatureLabel,
  startingMaterialLabel,
} from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

const startingMaterialItems = toComboboxItems(
  STARTING_MATERIALS,
  startingMaterialLabel,
);
const startingMaterialNatureItems = toComboboxItems(
  STARTING_MATERIAL_NATURES,
  startingMaterialNatureLabel,
);
const finalProductItems = toComboboxItems(FINAL_PRODUCTS, finalProductLabel);
const experimentTypeItems = toComboboxItems(
  EXPERIMENT_TYPES,
  experimentTypeLabel,
);

const measurements = [
  {
    key: "temperature" as const,
    label: m.field_synthesis_temperature,
    unitLabel: m.field_synthesis_temperature_unit,
    items: toComboboxItems(
      TEMPERATURE_UNITS,
      (value) => temperatureUnitLabel[value],
    ),
  },
  {
    key: "pressure" as const,
    label: m.field_synthesis_pressure,
    unitLabel: m.field_synthesis_pressure_unit,
    items: toComboboxItems(PRESSURE_UNITS, (value) => pressureUnitLabel[value]),
  },
];

const durationUnitItems = toComboboxItems(
  EXPERIMENT_DURATION_UNITS,
  (value) => experimentDurationUnitLabel[value],
);

export function SampleSyntheticDetailsFields() {
  const form = useSampleForm();
  const isNotRelevantDisabled = useIsFieldDisabled(
    "syntheticDetails.experimentDurationNotRelevant",
  );
  return (
    <div className="grid gap-4">
      <form.AppField name="syntheticDetails.startingMaterial">
        {(field) => (
          <field.ComboboxField
            label={m.field_starting_material()}
            requiredToPublish
            items={startingMaterialItems}
            placeholder={m.starting_material_placeholder()}
            searchPlaceholder={m.starting_material_search_placeholder()}
            emptyText={m.starting_material_empty()}
          />
        )}
      </form.AppField>

      <form.AppField name="syntheticDetails.startingMaterialNature">
        {(field) => (
          <field.ComboboxField
            label={m.field_starting_material_nature()}
            requiredToPublish
            items={startingMaterialNatureItems}
            placeholder={m.starting_material_nature_placeholder()}
            searchPlaceholder={m.starting_material_nature_search_placeholder()}
            emptyText={m.starting_material_nature_empty()}
          />
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) =>
          needsStartingMaterialComposition(
            state.values.syntheticDetails.startingMaterial,
          )
        }
      >
        {(needsComposition) =>
          needsComposition ? (
            <form.AppField name="syntheticDetails.startingMaterialComposition">
              {(field) => (
                <field.TextField
                  label={m.field_starting_material_composition()}
                  requiredToPublish
                  multiline
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>

      <form.AppField name="syntheticDetails.finalProduct">
        {(field) => (
          <field.ComboboxField
            label={m.field_final_product()}
            requiredToPublish
            items={finalProductItems}
            placeholder={m.final_product_placeholder()}
            searchPlaceholder={m.final_product_search_placeholder()}
            emptyText={m.final_product_empty()}
          />
        )}
      </form.AppField>

      <form.AppField name="syntheticDetails.experimentType">
        {(field) => (
          <field.ComboboxField
            label={m.field_experiment_type()}
            items={experimentTypeItems}
            placeholder={m.experiment_type_placeholder()}
            searchPlaceholder={m.experiment_type_search_placeholder()}
            emptyText={m.experiment_type_empty()}
          />
        )}
      </form.AppField>

      <form.AppField name="syntheticDetails.experimentDurationNotRelevant">
        {(field) => (
          <div className="flex items-center gap-2">
            <Switch
              id="experiment-duration-not-relevant"
              checked={field.state.value}
              disabled={isNotRelevantDisabled}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
            <Label htmlFor="experiment-duration-not-relevant">
              {m.field_experiment_duration_not_relevant()}
            </Label>
          </div>
        )}
      </form.AppField>

      <form.Subscribe
        selector={(state) =>
          state.values.syntheticDetails.experimentDurationNotRelevant
        }
      >
        {(notRelevant) =>
          notRelevant ? null : (
            <MeasurementFieldPair
              name="syntheticDetails.experimentDuration"
              selectValue={(values) =>
                values.syntheticDetails.experimentDurationValue
              }
              label={m.field_experiment_duration}
              unitLabel={m.field_experiment_duration_unit}
              items={durationUnitItems}
            />
          )
        }
      </form.Subscribe>

      <DateRangeField
        prefix="syntheticDetails.synthesisDate"
        id="synthesis-dates"
        groupLabel={m.field_synthesis_dates()}
        rangeModeLabel={m.synthesis_date_mode_range()}
        singleLabel={m.field_synthesis_date()}
        startLabel={m.field_synthesis_date_start()}
        endLabel={m.field_synthesis_date_end()}
        identicalMessage={m.synthesis_date_range_identical}
      />

      <form.AppField name="syntheticDetails.operatorName">
        {(field) => (
          <field.TextField label={m.field_operator_name()} requiredToPublish />
        )}
      </form.AppField>

      <form.AppField name="syntheticDetails.operatorOrcid">
        {(field) => <field.TextField label={m.field_operator_orcid()} />}
      </form.AppField>

      <form.AppField name="syntheticDetails.researchStructure">
        {(field) => (
          <field.MultiComboboxField
            label={m.field_synthetic_research_structure()}
            items={organizationItems}
            placeholder={m.organization_placeholder()}
            searchPlaceholder={m.organization_search_placeholder()}
            emptyText={m.organization_empty()}
            removeLabel={(label) =>
              m.synthetic_research_structure_remove({ label })
            }
          />
        )}
      </form.AppField>

      {measurements.map(({ key, label, unitLabel, items }) => (
        <MeasurementFieldPair
          key={key}
          name={`syntheticDetails.${key}`}
          selectValue={(values) => values.syntheticDetails[`${key}Value`]}
          label={label}
          unitLabel={unitLabel}
          items={items}
        />
      ))}

      <form.AppField name="syntheticDetails.experimentalProtocol">
        {(field) => (
          <field.TextField label={m.field_experimental_protocol()} multiline />
        )}
      </form.AppField>

      <form.AppField name="syntheticDetails.experimentPurpose">
        {(field) => (
          <field.TextField label={m.field_experiment_purpose()} multiline />
        )}
      </form.AppField>

      <form.AppField name="syntheticDetails.equipmentUsed">
        {(field) => <field.TextField label={m.field_equipment_used()} />}
      </form.AppField>
    </div>
  );
}
