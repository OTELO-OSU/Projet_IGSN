import type { Nature } from "@projet-igsn/domain/sample/nature";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
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
  // Reports every value change, letting the page track unsaved edits.
  onValuesChange?: (value: { name: string; nature: string }) => void;
  // When set, shows the IGSN as a read-only field (empty until published).
  igsn?: string | null;
  // When set, shows the publication status as a read-only field.
  published?: boolean;
  isPending?: boolean;
  defaultValues?: CreateSample;
  submitLabel: string;
};

export function SampleForm({
  onSubmit,
  onCancel,
  onValuesChange,
  igsn,
  published,
  isPending,
  defaultValues,
  submitLabel,
}: SampleFormProps) {
  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? "",
      nature: defaultValues?.nature ?? ("" as Nature | ""),
      // Not editable here yet; carried through so saving keeps the value.
      type: defaultValues?.type ?? null,
    },
    listeners: {
      onChange: ({ formApi }) => onValuesChange?.(formApi.state.values),
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

        {igsn !== undefined ? (
          <div className="grid gap-2">
            <Label htmlFor="sample-igsn">{m.field_igsn()}</Label>
            <Input id="sample-igsn" value={igsn ?? ""} readOnly />
          </div>
        ) : null}

        {published !== undefined ? (
          <div className="grid gap-2">
            <Label htmlFor="sample-published">{m.field_published()}</Label>
            <Switch id="sample-published" checked={published} disabled />
          </div>
        ) : null}

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
          <form.SubmitButton label={submitLabel} disabled={isPending} />
        </form.AppForm>
      </div>
    </form>
  );
}
