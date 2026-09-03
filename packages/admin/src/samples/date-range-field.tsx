import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { useState } from "react";

import { useSampleForm } from "#/samples/use-sample-form.ts";

type DateRangePrefix =
  | "description.collectionDate"
  | "syntheticDetails.synthesisDate";

type TimePrecision = {
  precisionName: "description.collectionDatePrecision";
  timeZoneName: "description.collectionDateTimeZone";
  modeLabel: string;
  zoneLabel: string;
  zonePlaceholder: string;
  zoneSearchPlaceholder: string;
  zoneEmptyText: string;
};

type DateRangeFieldProps = {
  prefix: DateRangePrefix;
  id: string;
  groupLabel: string;
  rangeModeLabel: string;
  singleLabel: string;
  startLabel: string;
  endLabel: string;
  identicalMessage: () => string;
  requiredToPublish?: boolean;
  time?: TimePrecision;
};

const timeZoneItems = Intl.supportedValuesOf("timeZone").map((zone) => ({
  value: zone,
  label: zone,
}));

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
  time,
}: DateRangeFieldProps) {
  const startName = `${prefix}Start` as const;
  const endName = `${prefix}End` as const;
  const isDateDisabled = useIsFieldDisabled(startName);
  const form = useSampleForm();
  const [isRange, setIsRange] = useState(
    () => form.getFieldValue(startName) !== form.getFieldValue(endName),
  );
  const isHourPrecision = () =>
    time !== undefined && form.getFieldValue(time.precisionName) === "hour";

  const clearBoundErrors = () => {
    for (const name of [startName, endName]) {
      form.setFieldMeta(name, (meta) => ({ ...meta, errorMap: {} }));
    }
  };

  const toggleRange = (checked: boolean) => {
    setIsRange(checked);
    if (!checked) {
      form.setFieldValue(endName, form.getFieldValue(startName));
    }
    clearBoundErrors();
  };

  const togglePrecision = (checked: boolean) => {
    if (time === undefined) return;
    form.setFieldValue(time.precisionName, checked ? "hour" : "day");
    for (const name of [startName, endName]) {
      const bound = form.getFieldValue(name);
      if (bound !== undefined) {
        form.setFieldValue(
          name,
          checked ? `${bound}T00:00` : bound.slice(0, 10),
        );
      }
    }
    if (checked && !form.getFieldValue(time.timeZoneName)) {
      form.setFieldValue(
        time.timeZoneName,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    }
    clearBoundErrors();
  };

  const identicalRange = () => {
    const start = form.getFieldValue(startName);
    const end = form.getFieldValue(endName);
    return start !== undefined && start === end
      ? { message: identicalMessage() }
      : undefined;
  };

  return (
    <form.Subscribe selector={isHourPrecision}>
      {(isHour) => (
        <div
          role="group"
          aria-labelledby={`${id}-label`}
          className="grid gap-2"
        >
          <div className="flex items-center gap-4">
            <span
              id={`${id}-label`}
              className="text-sm leading-none font-medium"
            >
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
            {time ? (
              <div className="flex items-center gap-2">
                <Switch
                  id={`${id}-time-mode`}
                  checked={isHour}
                  onCheckedChange={togglePrecision}
                  disabled={isDateDisabled}
                />
                <Label htmlFor={`${id}-time-mode`}>{time.modeLabel}</Label>
              </div>
            ) : null}
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
                      <field.DateField
                        label={startLabel}
                        requiredToPublish
                        withTime={isHour}
                      />
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
                      <field.DateField
                        label={endLabel}
                        requiredToPublish
                        withTime={isHour}
                      />
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
                    <field.DateField
                      label={singleLabel}
                      requiredToPublish
                      withTime={isHour}
                    />
                  )}
                </form.AppField>
              </div>
            )}
          </div>
          {time && isHour ? (
            <form.AppField name={time.timeZoneName}>
              {(field) => (
                <field.ComboboxField
                  label={time.zoneLabel}
                  requiredToPublish
                  items={timeZoneItems}
                  placeholder={time.zonePlaceholder}
                  searchPlaceholder={time.zoneSearchPlaceholder}
                  emptyText={time.zoneEmptyText}
                />
              )}
            </form.AppField>
          ) : null}
        </div>
      )}
    </form.Subscribe>
  );
}
