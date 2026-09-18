import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { compareProcessSteps } from "@projet-igsn/domain/sample/process-step/compare-process-steps";
import {
  PROCESS_STEP_KINDS,
  type ProcessStepKind,
} from "@projet-igsn/domain/sample/process-step/kind";
import { ChevronDownIcon, Trash2 } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { DateRangeField } from "#/samples/date-range-field.tsx";
import { EMPTY_PROCESS_STEP_DRAFT } from "#/samples/sample-draft-schema.ts";
import { processStepKindLabel } from "#/samples/sample-labels.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";

function stepRank(kind: ProcessStepKind, steps: { kind: ProcessStepKind }[]) {
  const later = steps.findIndex(
    (step) => compareProcessSteps({ kind }, { kind: step.kind }) < 0,
  );
  return later === -1 ? steps.length : later;
}

export function SampleProcessStepsFields() {
  const form = useSampleForm();
  const isDisabled = useIsFieldDisabled("processSteps");
  return (
    <FormSection title={m.section_process_steps()}>
      <form.Subscribe selector={(state) => state.values.processSteps}>
        {(steps) =>
          steps.map((step, index) => (
            <fieldset
              key={step.key}
              className="grid gap-2 rounded-lg border p-4"
            >
              <legend className="px-1 text-sm font-medium">
                {m.legend_process_step({
                  index: index + 1,
                  kind: processStepKindLabel(step.kind),
                })}
              </legend>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isDisabled}
                  aria-label={m.action_remove_process_step({
                    index: index + 1,
                  })}
                  onClick={() => form.removeFieldValue("processSteps", index)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <DateRangeField
                prefix={`processSteps[${index}].date`}
                id={`process-step-${index}-date`}
                groupLabel={m.field_process_step_dates()}
                rangeModeLabel={m.process_step_date_mode_range()}
                timeModeLabel={m.process_step_date_mode_time()}
                timeZoneLabel={m.field_process_step_time_zone()}
                singleLabel={m.field_process_step_date()}
                startLabel={m.field_process_step_date_start()}
                endLabel={m.field_process_step_date_end()}
                identicalMessage={m.process_step_date_range_identical}
              />
              <form.AppField name={`processSteps[${index}].description`}>
                {(field) => (
                  <field.TextField
                    label={m.field_process_step_description()}
                    multiline
                  />
                )}
              </form.AppField>
            </fieldset>
          ))
        }
      </form.Subscribe>
      {isDisabled ? null : (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                {m.action_add_process_step()}
                <ChevronDownIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {PROCESS_STEP_KINDS.map((kind) => (
                <DropdownMenuItem
                  key={kind}
                  onSelect={() =>
                    form.insertFieldValue(
                      "processSteps",
                      stepRank(kind, form.state.values.processSteps),
                      {
                        key: crypto.randomUUID(),
                        kind,
                        ...EMPTY_PROCESS_STEP_DRAFT,
                      },
                    )
                  }
                >
                  {processStepKindLabel(kind)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </FormSection>
  );
}
