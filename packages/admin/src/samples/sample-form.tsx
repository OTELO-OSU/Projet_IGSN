import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { ReactNode } from "react";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@projet-igsn/design-system/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { natureSchema } from "@projet-igsn/domain/sample/nature";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { type CreateSample } from "@projet-igsn/domain/sample/sample";

import { m } from "#/paraglide/messages.js";
import { CollectionMethodField } from "#/samples/collection-method-field.tsx";
import { composeDescription } from "#/samples/compose-description.ts";
import { composeLocation } from "#/samples/compose-location.ts";
import { MaterialField } from "#/samples/material-field.tsx";
import { MetamorphicFaciesField } from "#/samples/metamorphic-facies-field.tsx";
import { PhysicalDescriptionFields } from "#/samples/physical-description-fields.tsx";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";
import { PublishSampleButton } from "#/samples/publish-sample-button.tsx";
import { SampleConditionFields } from "#/samples/sample-condition-fields.tsx";
import { sampleDraftFieldErrors } from "#/samples/sample-draft-field-errors.ts";
import {
  publishedSampleSchema,
  type SampleDraft,
  sampleDraftSchema,
  toSampleDraft,
} from "#/samples/sample-draft-schema.ts";
import { natureLabel } from "#/samples/sample-labels.ts";
import { SampleTypeFields } from "#/samples/sample-type-fields.tsx";
import { TextureField } from "#/samples/texture-field.tsx";

const natureItems = natureSchema.options.map((nature) => ({
  value: nature,
  label: natureLabel(nature),
}));

// Draft -> domain-schema issues -> per-field translated errors. A published
// sample validates against the publishable shape, a draft against the create
// shape (same split as the API's PUT).
const validateDraft =
  (schema: typeof sampleDraftSchema) =>
  ({ value }: { value: SampleDraft }) => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? undefined
      : { fields: sampleDraftFieldErrors(parsed.error.issues, value) };
  };

// A footer button. `submit` saves; `publish` saves then publishes (with
// confirmation + a blocker tooltip); `link` navigates (e.g. the public page).
export type SampleFormAction =
  | { kind: "submit"; label: string; onSubmit: (value: CreateSample) => void }
  | { kind: "publish"; label: string; onPublish: (value: CreateSample) => void }
  | { kind: "link"; label: string; href: string };

type SampleFormProps = {
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: CreateSample;
  // A published sample's edits must keep it publishable (stricter schema).
  published?: boolean;
  // Rendered accented; `secondaryAction`, when set, sits before it as outline.
  primaryAction: SampleFormAction;
  secondaryAction?: SampleFormAction;
};

export function SampleForm({
  onCancel,
  isPending,
  defaultValues,
  published = false,
  primaryAction,
  secondaryAction,
}: SampleFormProps) {
  const validate = validateDraft(
    published ? publishedSampleSchema : sampleDraftSchema,
  );
  // Enter submits natively through the lone submit-kind button; route it to
  // that action (prefer primary). Publish and link never fire on Enter.
  const defaultSubmit =
    primaryAction.kind === "submit"
      ? primaryAction.onSubmit
      : secondaryAction?.kind === "submit"
        ? secondaryAction.onSubmit
        : undefined;

  const form = useAppForm({
    defaultValues: toSampleDraft(defaultValues),
    // The clicked button passes its callback as meta; Enter uses defaultSubmit.
    onSubmitMeta: { onValid: defaultSubmit } as {
      onValid: ((value: CreateSample) => void) | undefined;
    },
    // The domain schema (the one the API enforces) is the single source of
    // validation: it runs live on every change and gates every submit, its
    // issues translated and pinned on the offending fields. The live pass
    // only flags touched fields, so typing in one input never lights up the
    // rest of the form; submit flags everything.
    validators: {
      onChange: (context) => {
        const result = validate(context);
        if (!result) return undefined;
        const fieldMeta = context.formApi.state.fieldMeta as Record<
          string,
          { isTouched: boolean } | undefined
        >;
        const touched = Object.fromEntries(
          Object.entries(result.fields).filter(
            ([name]) => fieldMeta[name]?.isTouched,
          ),
        );
        return Object.keys(touched).length > 0
          ? { fields: touched }
          : undefined;
      },
      onSubmit: validate,
    },
    onSubmit: ({ value, meta, formApi }) => {
      const parsed = sampleDraftSchema.safeParse(value);
      // Unreachable: the onSubmit validator gates. Kept as a typed narrow.
      if (!parsed.success) return;
      meta.onValid?.(parsed.data);
      // Reset to what was submitted: leftovers the save dropped (a hidden
      // geometry's coordinates, the other region kind's leaf) must not
      // resurface when the user switches back after saving.
      formApi.reset(toSampleDraft(parsed.data));
    },
  });

  // Gate a button on canSubmit (an invalid form would silently do nothing)
  // and on the publish blockers, which the tooltip lists so the disabled
  // button explains itself. Used by Save & Publish and, for a published
  // sample, by the plain save: both must hold the publishable bar.
  const renderPublishGated = (
    renderButton: (disabled: boolean) => ReactNode,
  ) => (
    <form.Subscribe
      selector={(state) => ({
        canSubmit: state.canSubmit,
        typePath: state.values.typePath,
        materialPath: state.values.materialPath,
        metamorphicFacies: state.values.metamorphicFacies,
        location: state.values.location,
        description: state.values.description,
      })}
    >
      {({
        canSubmit,
        typePath,
        materialPath,
        metamorphicFacies,
        location,
        description,
      }) => {
        // Form state holds looser select strings; the runtime values match
        // the domain, so cast to the fields samplePublishBlockers reads.
        const reasons = samplePublishBlockers({
          type: composeHierarchyValue(typePath),
          material: composeHierarchyValue(materialPath),
          metamorphicFacies: metamorphicFacies || null,
          location: composeLocation(location),
          description: composeDescription(description),
          age: null,
        } as Pick<
          Sample,
          | "type"
          | "material"
          | "metamorphicFacies"
          | "location"
          | "description"
          | "age"
        >).map(publishBlockerLabel);
        const button = renderButton(
          isPending || !canSubmit || reasons.length > 0,
        );
        return reasons.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* The disabled button is not focusable, so the span carries
                  the tooltip: hover and keyboard both reveal the reason. */}
              <span tabIndex={0}>{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{m.publish_blocked_title()}</p>
              <ul className="list-disc ps-4">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        ) : (
          button
        );
      }}
    </form.Subscribe>
  );

  const renderAction = (action: SampleFormAction, variant?: "outline") => {
    if (action.kind === "link") {
      return (
        <Button asChild variant={variant}>
          <a href={action.href} target="_blank" rel="noopener noreferrer">
            {action.label}
          </a>
        </Button>
      );
    }
    if (action.kind === "publish") {
      // Save & Publish saves first, so unsaved edits are not a blocker here.
      return renderPublishGated((disabled) => (
        <PublishSampleButton
          label={action.label}
          disabled={disabled}
          onPublish={() =>
            void form.handleSubmit({ onValid: action.onPublish })
          }
        />
      ));
    }
    // ponytail: a native submit button routes through the form's default meta
    // (defaultSubmit), so only one submit-kind action is supported at a time.
    // No caller needs two; add explicit per-button meta if that ever changes.
    const submitButton = (disabled: boolean) => (
      <form.AppForm>
        <form.SubmitButton
          label={action.label}
          variant={variant}
          disabled={disabled}
        />
      </form.AppForm>
    );
    // A published sample's save must keep it publishable, so it gates on the
    // blockers like the first publish; a draft saves freely.
    return published
      ? renderPublishGated(submitButton)
      : submitButton(isPending ?? false);
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <Tabs defaultValue="classification">
        <TabsList>
          <TabsTrigger value="classification">
            {m.tab_sample_classification()}
          </TabsTrigger>
          <TabsTrigger value="type">{m.tab_sample_type()}</TabsTrigger>
          <TabsTrigger value="physical-description">
            {m.tab_physical_description()}
          </TabsTrigger>
          <TabsTrigger value="condition">
            {m.tab_sample_condition()}
          </TabsTrigger>
        </TabsList>

        {/* Values live in the form store, not the field components, so a field
            unmounting when its tab hides never drops what the user entered. */}
        <TabsContent value="classification" className="grid gap-4">
          <form.AppField
            name="name"
            validators={{
              onChange: ({ value }) =>
                value?.trim()
                  ? undefined
                  : { message: m.field_name_required() },
            }}
          >
            {(field) => (
              <field.TextField label={m.field_name()} requiredToPublish />
            )}
          </form.AppField>

          <form.AppForm>
            <SampleTypeFields />
          </form.AppForm>

          <form.AppField
            name="nature"
            validators={{
              onChange: ({ value }) =>
                value ? undefined : { message: m.field_nature_required() },
            }}
          >
            {(field) => (
              <field.ComboboxField
                label={m.field_nature()}
                requiredToPublish
                items={natureItems}
                placeholder={m.nature_placeholder()}
                searchPlaceholder={m.nature_search_placeholder()}
                emptyText={m.nature_empty()}
              />
            )}
          </form.AppField>

          <form.AppForm>
            <CollectionMethodField />
          </form.AppForm>

          <form.AppField name="collectionMethodDescription">
            {(field) => (
              <field.TextField
                label={m.field_collection_method_description()}
                multiline
              />
            )}
          </form.AppField>
        </TabsContent>

        <TabsContent value="type" className="grid gap-4">
          <FormSection title={m.section_material()}>
            <form.AppForm>
              <MaterialField />
            </form.AppForm>
            <form.AppForm>
              <TextureField />
            </form.AppForm>
            <form.AppForm>
              <MetamorphicFaciesField />
            </form.AppForm>
          </FormSection>

          <form.AppField name="specificName">
            {(field) => <field.TextField label={m.field_specific_name()} />}
          </form.AppField>
        </TabsContent>

        <TabsContent value="physical-description" className="grid gap-6">
          <form.AppForm>
            <PhysicalDescriptionFields />
          </form.AppForm>
        </TabsContent>

        <TabsContent value="condition" className="grid gap-6">
          <FormSection title={m.section_condition()}>
            <form.AppForm>
              <SampleConditionFields />
            </form.AppForm>
          </FormSection>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {m.action_cancel()}
        </Button>
        {secondaryAction ? renderAction(secondaryAction, "outline") : null}
        {renderAction(primaryAction)}
      </div>
    </form>
  );
}
