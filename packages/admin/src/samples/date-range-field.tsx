import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { getBy } from "@tanstack/react-form";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useSampleForm } from "#/samples/use-sample-form.ts";

type DateRangeFieldProps = {
  prefix: "description.collectionDate" | "syntheticDetails.synthesisDate";
  id: string;
  groupLabel: string;
  rangeModeLabel: string;
  timeModeLabel: string;
  timeZoneLabel: string;
  singleLabel: string;
  startLabel: string;
  endLabel: string;
  identicalMessage: () => string;
  requiredToPublish?: boolean;
};

const timeZoneItems = toComboboxItems(
  Intl.supportedValuesOf("timeZone"),
  (zone) => zone,
);

export function DateRangeField({
  prefix,
  id,
  groupLabel,
  rangeModeLabel,
  timeModeLabel,
  timeZoneLabel,
  singleLabel,
  startLabel,
  endLabel,
  identicalMessage,
  requiredToPublish = true,
}: DateRangeFieldProps) {
  const startName = `${prefix}Start` as const;
  const endName = `${prefix}End` as const;
  const precisionName = `${prefix}Precision` as const;
  const timeZoneName = `${prefix}TimeZone` as const;
  const isDateDisabled = useIsFieldDisabled(startName);
  const form = useSampleForm();
  const [isRange, setIsRange] = useState(
    () => form.getFieldValue(startName) !== form.getFieldValue(endName),
  );
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
    // Snapshot both bounds first: setting the start rewrites the end in single-date mode.
    const bounds = [startName, endName].map(
      (name) => [name, form.getFieldValue(name)] as const,
    );
    form.setFieldValue(precisionName, checked ? "hour" : "day");
    for (const [name, bound] of bounds) {
      if (bound !== undefined) {
        form.setFieldValue(
          name,
          checked ? `${bound}T00:00` : bound.slice(0, 10),
        );
      }
    }
    if (checked && !form.getFieldValue(timeZoneName)) {
      form.setFieldValue(
        timeZoneName,
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
    <form.Subscribe
      selector={(state) => getBy(state.values, precisionName) === "hour"}
    >
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
            <div className="flex items-center gap-2">
              <Switch
                id={`${id}-time-mode`}
                checked={isHour}
                onCheckedChange={togglePrecision}
                disabled={isDateDisabled}
              />
              <Label htmlFor={`${id}-time-mode`}>{timeModeLabel}</Label>
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
          {isHour ? (
            <form.AppField name={timeZoneName}>
              {(field) => (
                <field.ComboboxField
                  label={timeZoneLabel}
                  requiredToPublish
                  items={timeZoneItems}
                  placeholder={m.time_zone_placeholder()}
                  searchPlaceholder={m.time_zone_search_placeholder()}
                  emptyText={m.time_zone_empty()}
                />
              )}
            </form.AppField>
          ) : null}
        </div>
      )}
    </form.Subscribe>
  );
}
