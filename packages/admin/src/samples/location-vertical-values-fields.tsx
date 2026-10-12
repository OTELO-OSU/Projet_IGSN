import type { LocationType } from "@projet-igsn/domain/sample/location/location-type";

import { useIsFieldDisabled } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useSampleForm } from "#/samples/use-sample-form.ts";

type Bounds = readonly [() => string, () => string];

const RANGE_LABELS: Record<LocationType, Bounds> = {
  point: [m.field_vertical_position_min, m.field_vertical_position_max],
  area: [m.field_vertical_position_min, m.field_vertical_position_max],
  line: [m.field_start_vertical_position, m.field_end_vertical_position],
};

function VerticalValueFields({
  index,
  labels,
}: {
  index: number;
  labels: Bounds | readonly [() => string];
}) {
  const form = useSampleForm();
  const [startLabel, endLabel] = labels;
  const startName = `location.verticalPositions[${index}].start` as const;
  const endName = `location.verticalPositions[${index}].end` as const;
  return (
    <>
      <form.AppField
        name={startName}
        listeners={
          endLabel
            ? undefined
            : { onChange: ({ value }) => form.setFieldValue(endName, value) }
        }
      >
        {(field) => (
          <field.NumberField
            label={startLabel()}
            hint={m.field_vertical_position_hint()}
          />
        )}
      </form.AppField>
      {endLabel ? (
        <form.AppField name={endName}>
          {(field) => (
            <field.NumberField
              label={endLabel()}
              hint={m.field_vertical_position_hint()}
            />
          )}
        </form.AppField>
      ) : null}
    </>
  );
}

function PointVerticalValuesFields({ index }: { index: number }) {
  const form = useSampleForm();
  const startName = `location.verticalPositions[${index}].start` as const;
  const endName = `location.verticalPositions[${index}].end` as const;
  const isDisabled = useIsFieldDisabled(startName);
  const [isInterval, setIsInterval] = useState(
    () => form.getFieldValue(startName) !== form.getFieldValue(endName),
  );
  const toggleInterval = (checked: boolean) => {
    setIsInterval(checked);
    if (!checked) form.setFieldValue(endName, form.getFieldValue(startName));
  };
  const switchId = `vertical-position-${index}-interval`;
  return (
    <>
      <div className="grid content-start gap-2">
        <Label htmlFor={switchId}>{m.vertical_position_mode_interval()}</Label>
        <div className="flex h-9 items-center">
          <Switch
            id={switchId}
            checked={isInterval}
            onCheckedChange={toggleInterval}
            disabled={isDisabled}
          />
        </div>
      </div>
      <VerticalValueFields
        index={index}
        labels={isInterval ? RANGE_LABELS.point : [m.field_vertical_position]}
      />
    </>
  );
}

export function LocationVerticalValuesFields({
  index,
  type,
}: {
  index: number;
  type: LocationType;
}) {
  return type === "point" ? (
    <PointVerticalValuesFields index={index} />
  ) : (
    <VerticalValueFields index={index} labels={RANGE_LABELS[type]} />
  );
}
