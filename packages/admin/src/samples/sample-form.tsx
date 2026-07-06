import type { Nature } from "@projet-igsn/domain/sample/nature";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { natureSchema } from "@projet-igsn/domain/sample/nature";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";

import { m } from "#/paraglide/messages.js";
import { natureLabel } from "#/samples/nature-label.ts";

const natureItems = natureSchema.options.map((nature) => ({
  value: nature,
  label: natureLabel(nature),
}));

type SampleFormProps = {
  onSubmit: (value: CreateSample) => void;
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: CreateSample;
  submitLabel?: string;
};

export function SampleForm({
  onSubmit,
  onCancel,
  isPending,
  defaultValues,
  submitLabel,
}: SampleFormProps) {
  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? "",
      nature: defaultValues?.nature ?? ("" as Nature | ""),
    },
    onSubmit: ({ value }) => {
      // The API is the real trust boundary; re-parse before sending.
      const parsed = createSampleSchema.safeParse(value);
      if (parsed.success) {
        onSubmit(parsed.data);
      }
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid gap-4">
        <form.AppField
          name="name"
          validators={{
            onChange: ({ value }) =>
              value.trim() ? undefined : { message: m.field_name_required() },
          }}
        >
          {(field) => <field.TextField label={`${m.field_name()} *`} />}
        </form.AppField>

        <form.AppField
          name="nature"
          validators={{
            onChange: ({ value }) =>
              value ? undefined : { message: m.field_nature_required() },
          }}
        >
          {(field) => (
            <field.ComboboxField
              label={`${m.field_nature()} *`}
              items={natureItems}
              placeholder={m.nature_placeholder()}
              searchPlaceholder={m.nature_search_placeholder()}
              emptyText={m.nature_empty()}
            />
          )}
        </form.AppField>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {m.action_cancel()}
        </Button>
        <form.AppForm>
          <form.SubmitButton
            label={submitLabel ?? m.action_publish()}
            disabled={isPending}
          />
        </form.AppForm>
      </div>
    </form>
  );
}
