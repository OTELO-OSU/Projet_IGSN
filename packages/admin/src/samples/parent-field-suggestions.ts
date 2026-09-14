import type {
  FieldSuggestion,
  FieldSuggestionRule,
} from "@projet-igsn/design-system/components/form/field-suggestion-context";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { toSampleDraft } from "#/samples/sample-draft-schema.ts";
import { toSubSampleDefaults } from "#/samples/to-sub-sample-defaults.ts";

const NOT_INHERITED_FIELDS = new Set([
  "name",
  "nature",
  "materialPath",
  "parentIds",
  "manualGroupIds",
  "relations",
  "geologicalContextDescription",
  "geomorphologicalEnvironmentPath",
]);

const isInherited = (name: string, value: unknown) =>
  !NOT_INHERITED_FIELDS.has(name) &&
  !name.startsWith("location.") &&
  value != null &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toFormFields = (
  values: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> =>
  Object.entries(values).reduce<Record<string, unknown>>(
    (fields, [key, value]) => {
      const name = prefix === "" ? key : `${prefix}.${key}`;
      if (isPlainObject(value)) {
        return { ...fields, ...toFormFields(value, name) };
      }
      return isInherited(name, value) ? { ...fields, [name]: value } : fields;
    },
    {},
  );

export const parentFieldSuggestions = (
  parents: Sample[],
): FieldSuggestionRule["forField"] => {
  const inherited = parents.map((parent) => ({
    source: parent.name,
    fields: toFormFields(toSampleDraft(toSubSampleDefaults(parent))),
  }));
  return (name: string): FieldSuggestion[] =>
    inherited.flatMap(({ source, fields }) =>
      name in fields ? [{ source, value: fields[name] }] : [],
    );
};
