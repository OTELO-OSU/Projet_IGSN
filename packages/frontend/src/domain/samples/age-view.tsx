import type { Age } from "@projet-igsn/domain/sample/age/model";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  formatGeologicalAge,
  formatNumericAge,
} from "#/domain/samples/format-age.ts";
import { m } from "#/paraglide/messages.js";

export function hasAge(age: Sample["age"]): age is Age {
  if (!age) return false;
  return Boolean(
    formatNumericAge(age) || formatGeologicalAge(age) || age.geologicalUnit,
  );
}

export function AgeView({ age }: { age: Age }) {
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_numeric_age()}
        value={formatNumericAge(age)}
      />
      <FieldRow
        label={m.sample_field_geological_age()}
        value={formatGeologicalAge(age)}
      />
      <FieldRow
        label={m.sample_field_geological_unit()}
        value={age.geologicalUnit}
      />
    </FieldRows>
  );
}
