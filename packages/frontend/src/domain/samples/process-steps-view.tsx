import type { SampleProcessStep } from "@projet-igsn/domain/sample/process-step/model";

import { dateRangeText } from "#/domain/samples/date-range-text.ts";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { processStepKindLabel } from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

export function ProcessStepsView({
  processSteps,
}: {
  processSteps: SampleProcessStep[];
}) {
  return (
    <div className="mt-2 grid gap-6">
      {processSteps.map(({ kind, date, description }, index) => (
        <div key={index}>
          <h3 className="text-muted-foreground px-4 pt-3 font-medium">
            {processStepKindLabel(kind)}
          </h3>
          <FieldRows>
            <FieldRow
              label={m.sample_field_process_step_date()}
              value={date && dateRangeText(date)}
            />
            <FieldRow
              label={m.sample_field_process_step_description()}
              value={description}
            />
          </FieldRows>
        </div>
      ))}
    </div>
  );
}
