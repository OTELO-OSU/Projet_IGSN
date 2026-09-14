import type { DeepKeys } from "@tanstack/react-form";

import { useFieldSuggestionRule } from "@projet-igsn/design-system/components/form/field-suggestion-context";

import type { SampleDraft } from "#/samples/sample-draft-schema.ts";

import { useSampleForm } from "#/samples/use-sample-form.ts";

export function SuggestionOnlyRow<TName extends DeepKeys<SampleDraft>>({
  name,
  label,
  format,
}: {
  name: TName;
  label: string;
  format?: (value: unknown) => string;
}) {
  const form = useSampleForm();
  const { forField } = useFieldSuggestionRule();
  if (!forField(name).some(({ value }) => value !== undefined)) return null;
  return (
    <form.AppField name={name}>
      {(field) => <field.SuggestionRow label={label} format={format} />}
    </form.AppField>
  );
}
