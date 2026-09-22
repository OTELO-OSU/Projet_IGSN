import type {
  FieldSuggestion,
  FieldSuggestionRule,
} from "@projet-igsn/design-system/components/form/field-suggestion-context";
import type { Sample } from "@projet-igsn/domain/sample/sample";

import { m } from "#/paraglide/messages.js";
import { toSampleDraft } from "#/samples/sample-draft-schema.ts";
import { toSubSampleDefaults } from "#/samples/to-sub-sample-defaults.ts";

const NOT_INHERITED_FIELDS = new Set([
  "name",
  "nature",
  "materialPath",
  "parentIds",
  "manualGroupIds",
  "relations",
  "processSteps",
  "location",
  "geologicalContextDescription",
  "physiographicEnvironmentPath",
]);

const isInheritable = (name: string) => {
  const [root = name] = name.split(/[.[]/);
  return !NOT_INHERITED_FIELDS.has(root);
};

const hasValue = (value: unknown) =>
  value != null &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toFormFields = (
  values: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => {
      const name = prefix === "" ? key : `${prefix}.${key}`;
      return isPlainObject(value)
        ? Object.entries(toFormFields(value, name))
        : [[name, value]];
    }),
  );

export const parentFieldSuggestions = (
  parents: Sample[],
): FieldSuggestionRule => {
  const inherited = parents.map((parent) => ({
    source: parent.name,
    fields: toFormFields(
      toSampleDraft(toSubSampleDefaults([parent]), { defaults: false }),
    ),
  }));
  return {
    label: m.field_suggestions_from_parents(),
    noValueLabel: m.field_suggestion_no_value(),
    booleanLabel: (value) => (value ? m.value_yes() : m.value_no()),
    forField: (name: string): FieldSuggestion[] =>
      isInheritable(name)
        ? inherited.map(({ source, fields }) => ({
            source,
            value: hasValue(fields[name]) ? fields[name] : undefined,
          }))
        : [],
  };
};
