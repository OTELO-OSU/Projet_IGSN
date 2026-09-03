import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { useState } from "react";

import { useSampleForm } from "#/samples/use-sample-form.ts";

type DateRangePrefix =
  | "description.collectionDate"
  | "syntheticDetails.synthesisDate";

export function DateRangeField({
  prefix,
  id,
  groupLabel,
  rangeModeLabel,
  singleLabel,
  startLabel,
  endLabel,
  identicalMessage,
  requiredToPublish = true,
}: {
  prefix: DateRangePrefix;
  id: string;
  groupLabel: string;
  rangeModeLabel: string;
  singleLabel: string;
  startLabel: string;
  endLabel: string;
  identicalMessage: () => string;
  requiredToPublish?: boolean;
}) {
  const startName = `${prefix}Start` as const;
  const endName = `${prefix}End` as const;
  const isDateDisabled = useIsFieldDisabled(startName);
  const form = useSampleForm();
  const [isRange, setIsRange] = useState(
    () => form.getFieldValue(startName) !== form.getFieldValue(endName),
  );

  const toggleRange = (checked: boolean) => {
    setIsRange(checked);
    if (!checked) {
      form.setFieldValue(endName, form.getFieldValue(startName));
    }
    for (const name of [startName, endName]) {
      form.setFieldMeta(name, (meta) => ({ ...meta, errorMap: {} }));
    }
  };

  const identicalRange = () => {
    const start = form.getFieldValue(startName);
    const end = form.getFieldValue(endName);
    return start !== undefined && start === end
      ? { message: identicalMessage() }
      : undefined;
  };

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="grid gap-2">
      <div className="flex items-center gap-4">
        <span id={`${id}-label`} className="text-sm leading-none font-medium">
          {withRequired(groupLabel, requiredToPublish)}
        </span>
        <div className="flex items-center gap-2">
          <Switch
            id={`${id}-mode`}
            checked={isRange}
            onCheckedChange={toggleRange}
            disabled={isDateDisabled}
          />
          <Label htmlFor={`${id}-mode`}>{rangeModeLabel}</Label>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        {isRange ? (
          <>
            <div className="flex-1">
              <form.AppField
                name={startName}
                validators={{
                  onChangeListenTo: [endName],
                  onChange: identicalRange,
                }}
              >
                {(field) => (
                  <field.DateField label={startLabel} requiredToPublish />
                )}
              </form.AppField>
            </div>
            <div className="flex-1">
              <form.AppField
                name={endName}
                validators={{
                  onChangeListenTo: [startName],
                  onChange: identicalRange,
                }}
              >
                {(field) => (
                  <field.DateField label={endLabel} requiredToPublish />
                )}
              </form.AppField>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <form.AppField
              name={startName}
              listeners={{
                onChange: ({ value }) => form.setFieldValue(endName, value),
              }}
            >
              {(field) => (
                <field.DateField label={singleLabel} requiredToPublish />
              )}
            </form.AppField>
          </div>
        )}
      </div>
    </div>
  );
}
