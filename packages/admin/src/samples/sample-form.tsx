import type { Nature } from "@projet-igsn/domain/sample/nature";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { natureSchema } from "@projet-igsn/domain/sample/nature";
import {
  type CreateSample,
  createSampleSchema,
} from "@projet-igsn/domain/sample/sample";
import { type SampleType } from "@projet-igsn/domain/sample/type";

import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { natureLabel } from "#/samples/nature-label.ts";
import { PublishSampleButton } from "#/samples/publish-sample-button.tsx";
import {
  SampleTypeFields,
  composeType,
} from "#/samples/sample-type-fields.tsx";

const natureItems = natureSchema.options.map((nature) => ({
  value: nature,
  label: natureLabel(nature),
}));

type SampleFormProps = {
  onSubmit: (value: CreateSample) => void;
  onCancel: () => void;
  // When set, renders a "Save & Publish" button that saves then publishes.
  onPublish?: (value: CreateSample) => void;
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
  onPublish,
  igsn,
  published,
  isPending,
  defaultValues,
  submitLabel,
}: SampleFormProps) {
  const defaultType = defaultValues?.type ?? null;
  const form = useAppForm({
    defaultValues: {
      name: defaultValues?.name ?? "",
      nature: defaultValues?.nature ?? ("" as Nature | ""),
      type: (defaultType?.split(".")[0] ?? "") as SampleType | "",
      subType: defaultType?.includes(".") ? (defaultType as string) : "",
    },
    // The publish button carries { publish: true }; the primary button and
    // Enter submit with the default (save only). See TanStack Form onSubmitMeta.
    onSubmitMeta: { publish: false },
    onSubmit: ({ value, meta }) => {
      // The API is the real trust boundary; re-parse before sending.
      const parsed = createSampleSchema.safeParse({
        name: value.name,
        nature: value.nature,
        type: composeType(value),
      });
      if (!parsed.success) return;
      (meta.publish ? onPublish : onSubmit)?.(parsed.data);
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
            {/* output, not p: the label needs a labelable element to announce */}
            <output id="sample-igsn">{igsn ?? ""}</output>
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

        <form.AppForm>
          <SampleTypeFields />
        </form.AppForm>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {m.action_cancel()}
        </Button>
        <form.AppForm>
          <form.SubmitButton label={submitLabel} disabled={isPending} />
        </form.AppForm>
        {onPublish ? (
          // Gate on canSubmit too: confirming the irreversible-publish dialog on
          // an invalid form would close it and silently do nothing.
          <form.Subscribe selector={(state) => state.canSubmit}>
            {(canSubmit) => (
              <PublishSampleButton
                label={m.action_save_publish()}
                disabled={isPending || !canSubmit}
                onPublish={() => void form.handleSubmit({ publish: true })}
              />
            )}
          </form.Subscribe>
        ) : published && igsn ? (
          <Button asChild variant="outline">
            <a href={`${FRONTEND_URL}/samples/${igsn}`}>
              {m.action_view_public_page()}
            </a>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
