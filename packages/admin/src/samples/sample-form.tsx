import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { ReactNode } from "react";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
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
import { availabilitySchema } from "@projet-igsn/domain/sample/availability/availability";
import { natureSchema } from "@projet-igsn/domain/sample/nature";
import {
  type PublishableFields,
  samplePublishBlockers,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { type CreateSample } from "@projet-igsn/domain/sample/sample";

import { m } from "#/paraglide/messages.js";
import { AgeFields } from "#/samples/age-fields.tsx";
import { toAgeInput } from "#/samples/age-form.ts";
import { CollectionMethodField } from "#/samples/collection-method-field.tsx";
import { composeDescription } from "#/samples/compose-description.ts";
import { composeLocation } from "#/samples/compose-location.ts";
import { composeScientificContext } from "#/samples/compose-scientific-context.ts";
import { MaterialField } from "#/samples/material-field.tsx";
import { MetamorphicFaciesField } from "#/samples/metamorphic-facies-field.tsx";
import { PhysicalDescriptionFields } from "#/samples/physical-description-fields.tsx";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";
import { PublishSampleButton } from "#/samples/publish-sample-button.tsx";
import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";
import { SampleAttachmentUploadDialog } from "#/samples/sample-attachment-upload-dialog.tsx";
import { SampleAttachments } from "#/samples/sample-attachments.tsx";
import { sampleDraftFieldErrors } from "#/samples/sample-draft-field-errors.ts";
import {
  publishedSampleSchema,
  type SampleDraft,
  sampleDraftSchema,
  toSampleDraft,
} from "#/samples/sample-draft-schema.ts";
import { SampleEconomicInterestFields } from "#/samples/sample-economic-interest-fields.tsx";
import { availabilityLabel, natureLabel } from "#/samples/sample-labels.ts";
import { SampleLinksFields } from "#/samples/sample-links-fields.tsx";
import { SampleScientificContextFields } from "#/samples/sample-scientific-context-fields.tsx";
import { SampleSecurityFields } from "#/samples/sample-security-fields.tsx";
import { SampleTypeFields } from "#/samples/sample-type-fields.tsx";
import { TextureField } from "#/samples/texture-field.tsx";
import { type SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

const natureItems = toComboboxItems(natureSchema.options, natureLabel);
const availabilityItems = toComboboxItems(
  availabilitySchema.options,
  availabilityLabel,
);

// A published sample validates against the publishable shape, a draft against
// the create shape: a published sample must stay publishable, so its blockers
// are field errors too.
const validateDraft =
  (schema: typeof sampleDraftSchema) =>
  ({ value }: { value: SampleDraft }) => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? undefined
      : { fields: sampleDraftFieldErrors(parsed.error.issues, value) };
  };

export type SampleFormAction =
  | { kind: "submit"; label: string; onSubmit: (value: CreateSample) => void }
  | { kind: "publish"; label: string; onPublish: (value: CreateSample) => void }
  | { kind: "link"; label: string; href: string };

type SampleFormProps = {
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: CreateSample;
  // Freezes the IGSN-identity and partial-frozen fields (ADR 0021), and gates
  // the save on the publishable bar (stricter schema).
  published?: boolean;
  primaryAction: SampleFormAction;
  secondaryAction?: SampleFormAction;
  // Uploads need a sample id, so creation (no id yet) hides the Links tab.
  sampleId?: string;
  attachments?: SampleAttachment[];
  // Applied only when the form submits, so cancelling leaves the server
  // untouched.
  attachmentChanges?: SampleAttachmentChanges;
};

export function SampleForm({
  onCancel,
  isPending,
  defaultValues,
  published = false,
  primaryAction,
  secondaryAction,
  sampleId,
  attachments = [],
  attachmentChanges,
}: SampleFormProps) {
  const validate = validateDraft(
    published ? publishedSampleSchema : sampleDraftSchema,
  );
  // Which fields the publication freezes, from the stored provenance status:
  // it is itself frozen, so reading the live form value would buy nothing.
  const isFieldFrozen = published
    ? publishedSampleFrozenField(
        defaultValues?.scientificContext?.provenanceStatus ?? null,
        defaultValues?.material ?? null,
      )
    : () => false;
  // Enter submits natively through the lone submit-kind button.
  const defaultSubmit =
    primaryAction.kind === "submit"
      ? primaryAction.onSubmit
      : secondaryAction?.kind === "submit"
        ? secondaryAction.onSubmit
        : undefined;

  const form = useAppForm({
    defaultValues: toSampleDraft(defaultValues),
    onSubmitMeta: { onValid: defaultSubmit } as {
      onValid: ((value: CreateSample) => void) | undefined;
    },
    // The live pass only flags touched fields, so typing in one input never
    // lights up the rest of the form; submit flags everything.
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
    onSubmit: async ({ value, meta, formApi }) => {
      const parsed = sampleDraftSchema.safeParse(value);
      // Unreachable: the onSubmit validator gates. Kept as a typed narrow.
      if (!parsed.success) return;
      // Attachments live outside the form state, so their limit cannot pin a
      // field error: the save noops like any invalid field and the red file
      // count says why. The api refuses the payload anyway.
      if ((attachmentChanges?.keptCount ?? attachments.length) > UPLOAD_LIMIT) {
        return;
      }
      const committed = attachmentChanges
        ? await attachmentChanges.commit(attachments)
        : undefined;
      meta.onValid?.(
        committed ? { ...parsed.data, attachments: committed } : parsed.data,
      );
      // Reset to what was submitted: leftovers the save dropped (a hidden
      // geometry's coordinates, the other region kind's leaf) must not
      // resurface when the user switches back after saving.
      formApi.reset(toSampleDraft(parsed.data));
    },
  });

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
        availability: state.values.availability,
        age: toAgeInput(state.values.age),
        scientificContext: composeScientificContext(
          state.values.scientificContext,
        ),
      })}
    >
      {({
        canSubmit,
        typePath,
        materialPath,
        metamorphicFacies,
        location,
        description,
        availability,
        age,
        scientificContext,
      }) => {
        // Form state holds looser select strings; the runtime values match
        // the domain, so cast to the fields samplePublishBlockers reads.
        // Attachments live outside the form state: only the count the save
        // would keep matters.
        const reasons = samplePublishBlockers(
          {
            type: composeHierarchyValue(typePath),
            material: composeHierarchyValue(materialPath),
            metamorphicFacies: metamorphicFacies || null,
            location: composeLocation(location),
            description: composeDescription(description),
            age,
            availability: availability ?? null,
            scientificContext,
            attachments: {
              length: attachmentChanges?.keptCount ?? attachments.length,
            },
          } as PublishableFields & { attachments: { length: number } },
          UPLOAD_LIMIT,
        ).map(publishBlockerLabel);
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
    // blockers like the first publish; a draft saves freely (over the
    // attachment limit the submit noops, see onSubmit).
    return published
      ? renderPublishGated(submitButton)
      : submitButton(isPending ?? false);
  };

  return (
    <FieldDisabledProvider value={isFieldFrozen}>
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
            <TabsTrigger value="scientific-context">
              {m.tab_scientific_context()}
            </TabsTrigger>
            {sampleId ? (
              <TabsTrigger value="links">{m.tab_links()}</TabsTrigger>
            ) : null}
          </TabsList>

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

            <FormSection title={m.section_availability()}>
              <form.AppField name="availability">
                {(field) => (
                  <field.ComboboxField
                    label={m.field_availability()}
                    requiredToPublish
                    items={availabilityItems}
                    placeholder={m.availability_placeholder()}
                    searchPlaceholder={m.availability_search_placeholder()}
                    emptyText={m.availability_empty()}
                  />
                )}
              </form.AppField>
            </FormSection>

            <form.AppForm>
              <AgeFields />
            </form.AppForm>

            <FormSection title={m.section_security()}>
              <form.AppForm>
                <SampleSecurityFields />
              </form.AppForm>
            </FormSection>

            <FormSection title={m.section_economic_interest()}>
              <form.AppForm>
                <SampleEconomicInterestFields />
              </form.AppForm>
            </FormSection>
          </TabsContent>

          <TabsContent value="scientific-context" className="grid gap-4">
            <form.AppForm>
              <SampleScientificContextFields />
            </form.AppForm>
          </TabsContent>

          {sampleId ? (
            <TabsContent value="links" className="grid gap-6">
              <form.AppForm>
                <SampleLinksFields />
              </form.AppForm>
              {attachmentChanges ? (
                <SampleAttachments
                  sampleId={sampleId}
                  attachments={attachments}
                  changes={attachmentChanges}
                />
              ) : null}
            </TabsContent>
          ) : null}
        </Tabs>

        {/* Outside the Tabs: the upload progress dialog must show on submit
          whatever tab is active. */}
        {attachmentChanges ? (
          <SampleAttachmentUploadDialog changes={attachmentChanges} />
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {m.action_cancel()}
          </Button>
          {secondaryAction ? renderAction(secondaryAction, "outline") : null}
          {renderAction(primaryAction)}
        </div>
      </form>
    </FieldDisabledProvider>
  );
}
