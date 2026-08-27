import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";
import type { User } from "@projet-igsn/domain/user/model";
import type { ReactNode } from "react";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { composeHierarchyValue } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
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
import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import {
  type PublishableFields,
  samplePublishBlockers,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import {
  type CreateSample,
  type SampleStatus,
} from "@projet-igsn/domain/sample/sample";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";

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
import { PublishMenu } from "#/samples/publish-menu.tsx";
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
import { SampleManualGroupsField } from "#/samples/sample-manual-groups-field.tsx";
import { SampleScientificContextFields } from "#/samples/sample-scientific-context-fields.tsx";
import { SampleSecurityFields } from "#/samples/sample-security-fields.tsx";
import { SampleSubmitButton } from "#/samples/sample-submit-button.tsx";
import { SampleTypeFields } from "#/samples/sample-type-fields.tsx";
import { TextureField } from "#/samples/texture-field.tsx";
import { type SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

const natureItems = toComboboxItems(natureSchema.options, natureLabel);
const availabilityItems = toComboboxItems(
  availabilitySchema.options,
  availabilityLabel,
);

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
  | {
      kind: "publish";
      label: string;
      onPublish: (
        value: CreateSample,
        status: SetSampleStatusBody["status"],
      ) => void;
    }
  | { kind: "link"; label: string; href: string };

type SampleFormProps = {
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: CreateSample;
  status?: SampleStatus;
  primaryAction: SampleFormAction;
  secondaryAction?: SampleFormAction;
  sampleId?: string;
  attachments?: SampleAttachment[];
  attachmentChanges?: SampleAttachmentChanges;
  publisher?: Pick<User, "status" | "superAdmin">;
  readOnlyReason?: string;
  manualGroupOptions?: ManualGroup[];
};

export function SampleForm({
  onCancel,
  isPending,
  defaultValues,
  status = "draft",
  primaryAction,
  secondaryAction,
  sampleId,
  attachments = [],
  attachmentChanges,
  publisher,
  readOnlyReason,
  manualGroupOptions = [],
}: SampleFormProps) {
  const roleOnSample = useUserRoleOnSample(sampleId);
  const wasPublished = hasPermanentIgsn({ status });
  const validate = validateDraft(
    wasPublished ? publishedSampleSchema : sampleDraftSchema,
  );
  const isReadOnly = readOnlyReason !== undefined;
  const isFrozenByPublication = wasPublished
    ? publishedSampleFrozenField(
        defaultValues?.scientificContext?.provenanceStatus ?? null,
        defaultValues?.material ?? null,
      )
    : () => false;
  const areManualGroupsFrozen =
    roleOnSample !== null && !isSampleOwner(roleOnSample);
  const isFieldFrozen = isReadOnly
    ? () => true
    : (name: string) =>
        isFrozenByPublication(name) ||
        (name === "manualGroupIds" && areManualGroupsFrozen);
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
      if (!parsed.success) return;
      if ((attachmentChanges?.keptCount ?? attachments.length) > UPLOAD_LIMIT) {
        return;
      }
      const committed = attachmentChanges
        ? await attachmentChanges.commit(attachments)
        : undefined;
      meta.onValid?.(
        committed ? { ...parsed.data, attachments: committed } : parsed.data,
      );
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
          publisher,
        ).map(publishBlockerLabel);
        const button = renderButton(
          isReadOnly || isPending || !canSubmit || reasons.length > 0,
        );
        return reasons.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
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
      if (roleOnSample !== null && !isSampleEditor(roleOnSample)) {
        return null;
      }
      const publish = (status: SetSampleStatusBody["status"]) =>
        void form.handleSubmit({
          onValid: (value) => action.onPublish(value, status),
        });
      return renderPublishGated((disabled) => (
        <div className="flex">
          <ConfirmButton
            className="rounded-r-none"
            disabled={disabled}
            title={m.publish_sample_title()}
            description={m.publish_sample_warning()}
            confirmLabel={m.action_confirm()}
            cancelLabel={m.action_cancel()}
            closeLabel={m.action_close()}
            onConfirm={() => publish("published")}
          >
            {action.label}
          </ConfirmButton>
          <PublishMenu
            disabled={disabled}
            onPublishWithdrawn={() => publish("withdrawn")}
          />
        </div>
      ));
    }
    // ponytail: a native submit button routes through the form's default meta
    // (defaultSubmit), so only one submit-kind action is supported at a time.
    // No caller needs two; add explicit per-button meta if that ever changes.
    const submitButton = (disabled: boolean) => (
      <form.AppForm>
        <SampleSubmitButton
          label={action.label}
          variant={variant}
          disabled={disabled}
          sampleId={sampleId}
          status={status}
          blockedReason={readOnlyReason}
        />
      </form.AppForm>
    );
    return wasPublished
      ? renderPublishGated(submitButton)
      : submitButton(isReadOnly || (isPending ?? false));
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
            <FormSection title={m.section_sample_classification()}>
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
            </FormSection>

            <form.AppForm>
              <SampleManualGroupsField options={manualGroupOptions} />
            </form.AppForm>
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
            <FormSection title={m.section_scientific_context()}>
              <form.AppForm>
                <SampleScientificContextFields />
              </form.AppForm>
            </FormSection>
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
