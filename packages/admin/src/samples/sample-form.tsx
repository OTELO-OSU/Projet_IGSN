import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";
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
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";
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
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";
import { canEditFrozenSampleFields } from "@projet-igsn/domain/user/can-edit-frozen-sample-fields";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { AgeFields } from "#/samples/age-fields.tsx";
import { toAgeInput } from "#/samples/age-form.ts";
import { CollectionDateField } from "#/samples/collection-date-field.tsx";
import { CollectionMethodField } from "#/samples/collection-method-field.tsx";
import { composeDescription } from "#/samples/compose-description.ts";
import { composeLocation } from "#/samples/compose-location.ts";
import { composeRepository } from "#/samples/compose-repository.ts";
import { composeScientificContext } from "#/samples/compose-scientific-context.ts";
import { composeSyntheticDetails } from "#/samples/compose-synthetic-details.ts";
import {
  ConfirmMenuButton,
  type ConfirmMenuItem,
} from "#/samples/confirm-menu-button.tsx";
import {
  AvailabilityStatusField,
  ExistenceStatusField,
} from "#/samples/curation-fields.tsx";
import { LocationFields } from "#/samples/location-fields.tsx";
import { MaterialField } from "#/samples/material-field.tsx";
import { MetamorphicDetails } from "#/samples/metamorphic-details.tsx";
import { ProvenanceStatusField } from "#/samples/provenance-status-field.tsx";
import { PublicationYearField } from "#/samples/publication-year-field.tsx";
import { publishBlockerLabel } from "#/samples/publish-blocker-label.ts";
import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";
import { SampleAttachmentUploadDialog } from "#/samples/sample-attachment-upload-dialog.tsx";
import { SampleAttachments } from "#/samples/sample-attachments.tsx";
import { SampleConditionFields } from "#/samples/sample-condition-fields.tsx";
import { SampleDescriptionFields } from "#/samples/sample-description-fields.tsx";
import { sampleDraftFieldErrors } from "#/samples/sample-draft-field-errors.ts";
import {
  publishedSampleSchema,
  type SampleDraft,
  sampleDraftSchema,
  toSampleDraft,
} from "#/samples/sample-draft-schema.ts";
import { SampleEconomicInterestFields } from "#/samples/sample-economic-interest-fields.tsx";
import { SampleGeologicalContextFields } from "#/samples/sample-geological-context-fields.tsx";
import { natureLabel } from "#/samples/sample-labels.ts";
import { SampleManualGroupsField } from "#/samples/sample-manual-groups-field.tsx";
import { SampleRelationsFields } from "#/samples/sample-relations-fields.tsx";
import { SampleRepositoryFields } from "#/samples/sample-repository-fields.tsx";
import { SampleScientificContextFields } from "#/samples/sample-scientific-context-fields.tsx";
import { SampleSecurityFields } from "#/samples/sample-security-fields.tsx";
import { SampleSubmitButton } from "#/samples/sample-submit-button.tsx";
import { SampleSyntheticDetailsFields } from "#/samples/sample-synthetic-details-fields.tsx";
import { SampleTypeFields } from "#/samples/sample-type-fields.tsx";
import { TextureField } from "#/samples/texture-field.tsx";
import { type SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

const DEFAULT_TAB = "identity";

const natureItems = toComboboxItems(natureSchema.options, natureLabel);

const validateDraft =
  (schema: typeof sampleDraftSchema) =>
  ({ value }: { value: SampleDraft }) => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? undefined
      : { fields: sampleDraftFieldErrors(parsed.error.issues, value) };
  };

export type SampleSubmitMenu = {
  label: string;
  items: SampleSubmitMenuItem[];
};

export type SampleSubmitMenuItem = Omit<ConfirmMenuItem, "onConfirm"> & {
  onConfirm: (value: CreateSample) => void;
};

export type SampleFormAction =
  | {
      kind: "submit";
      label: string;
      onSubmit: (value: CreateSample) => void;
      menu?: SampleSubmitMenu;
    }
  | {
      kind: "publish";
      label: string;
      onPublish: (value: CreateSample, status: PublishStatus) => void;
    }
  | { kind: "link"; label: string; href: string };

export type SampleFormProps = {
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: CreateSample;
  status?: SampleStatus;
  primaryAction?: SampleFormAction;
  secondaryAction?: SampleFormAction;
  statusAction?: ReactNode;
  sampleId?: string;
  attachments?: SampleAttachment[];
  attachmentChanges?: SampleAttachmentChanges;
  currentUser?: Pick<User, "status" | "superAdmin">;
  readOnlyReason?: string;
  manualGroupOptions?: ManualGroup[];
  publicationYear?: number | null;
};

export function SampleForm({
  onCancel,
  isPending,
  defaultValues,
  status = "draft",
  primaryAction,
  secondaryAction,
  statusAction,
  sampleId,
  attachments = [],
  attachmentChanges,
  currentUser,
  readOnlyReason,
  manualGroupOptions = [],
  publicationYear,
}: SampleFormProps) {
  const [tab, setTab] = useState<string>(DEFAULT_TAB);
  const roleOnSample = useUserRoleOnSample(sampleId);
  const wasPublished = hasPermanentIgsn({ status });
  const validate = validateDraft(
    wasPublished ? publishedSampleSchema : sampleDraftSchema,
  );
  const isReadOnly = readOnlyReason !== undefined;
  const bypassesLocks =
    currentUser !== undefined && canEditFrozenSampleFields(currentUser);
  const isFrozenByPublication =
    wasPublished && !bypassesLocks
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
    primaryAction?.kind === "submit"
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
        existenceStatus: state.values.existenceStatus,
        availabilityStatus: state.values.availabilityStatus,
        age: toAgeInput(state.values.age),
        scientificContext: composeScientificContext(
          state.values.scientificContext,
        ),
        repository: composeRepository(state.values.repository),
        syntheticDetails: composeSyntheticDetails(
          state.values.syntheticDetails,
          composeHierarchyValue(state.values.materialPath),
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
        existenceStatus,
        availabilityStatus,
        age,
        scientificContext,
        repository,
        syntheticDetails,
      }) => {
        const reasons = samplePublishBlockers(
          {
            type: composeHierarchyValue(typePath),
            material: composeHierarchyValue(materialPath),
            metamorphicFacies: metamorphicFacies || null,
            location: composeLocation(location),
            description: composeDescription(description),
            age,
            existenceStatus: existenceStatus ?? null,
            availabilityStatus: availabilityStatus ?? null,
            scientificContext,
            repository,
            syntheticDetails,
            attachments: {
              length: attachmentChanges?.keptCount ?? attachments.length,
            },
          } as PublishableFields & { attachments: { length: number } },
          UPLOAD_LIMIT,
          currentUser,
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
      const publish = (status: PublishStatus) =>
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
          <ConfirmMenuButton
            label={m.action_publish_options()}
            className="border-l-primary-foreground/30 rounded-l-none border-l"
            disabled={disabled}
            items={[
              {
                label: m.action_publish_withdrawn(),
                title: m.publish_withdrawn_sample_title(),
                description: m.publish_withdrawn_sample_warning(),
                onConfirm: () => publish("withdrawn"),
              },
            ]}
          />
        </div>
      ));
    }
    // ponytail: only one submit-kind action is supported at a time.
    // add explicit per-button meta if that ever changes.
    const menu = action.menu;
    const submitButton = (disabled: boolean) => (
      <form.AppForm>
        <div className="flex">
          <SampleSubmitButton
            label={action.label}
            variant={variant}
            className={menu ? "rounded-r-none" : undefined}
            disabled={disabled}
            sampleId={sampleId}
            status={status}
            blockedReason={readOnlyReason}
          />
          {menu ? (
            <ConfirmMenuButton
              label={menu.label}
              variant={variant}
              className="-ml-px rounded-l-none"
              disabled={disabled}
              items={menu.items.map((item) => ({
                ...item,
                onConfirm: () =>
                  void form.handleSubmit({ onValid: item.onConfirm }),
              }))}
            />
          ) : null}
        </div>
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
        <form.Subscribe
          selector={(state) => ({
            material: composeHierarchyValue(state.values.materialPath),
            provenanceStatus: state.values.scientificContext.provenanceStatus,
          })}
        >
          {({ material, provenanceStatus }) => {
            const showSynthetic = isSyntheticMaterial(material);
            const isTabDisabled = (value: string) =>
              (value === "location" && !allowsLocation(material)) ||
              (value === "scientific-context" && !provenanceStatus);
            return (
              <Tabs
                value={isTabDisabled(tab) ? DEFAULT_TAB : tab}
                onValueChange={setTab}
              >
                <TabsList>
                  <TabsTrigger value={DEFAULT_TAB}>
                    {m.tab_identity()}
                  </TabsTrigger>
                  <TabsTrigger value="classification">
                    {m.tab_sample_classification()}
                  </TabsTrigger>
                  <TabsTrigger
                    value="location"
                    disabled={isTabDisabled("location")}
                  >
                    {m.tab_location()}
                  </TabsTrigger>
                  <TabsTrigger value="age">{m.tab_age()}</TabsTrigger>
                  <TabsTrigger value="physical-description">
                    {m.tab_physical_description()}
                  </TabsTrigger>
                  <TabsTrigger
                    value="scientific-context"
                    disabled={isTabDisabled("scientific-context")}
                  >
                    {m.tab_scientific_context()}
                  </TabsTrigger>
                  <TabsTrigger value="conservation">
                    {m.tab_conservation_security()}
                  </TabsTrigger>
                  <TabsTrigger value="curation">
                    {m.tab_curation_repository()}
                  </TabsTrigger>
                  <TabsTrigger value="related-resources">
                    {m.tab_related_resources()}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={DEFAULT_TAB} className="grid gap-4">
                  <FormSection title={m.section_sample()}>
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
                        <field.TextField
                          label={m.field_name()}
                          requiredToPublish
                        />
                      )}
                    </form.AppField>

                    <form.AppForm>
                      <SampleTypeFields />
                    </form.AppForm>

                    <form.AppField
                      name="nature"
                      validators={{
                        onChange: ({ value }) =>
                          value
                            ? undefined
                            : { message: m.field_nature_required() },
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

                    <form.AppForm>
                      <ProvenanceStatusField />
                    </form.AppForm>

                    <form.AppForm>
                      <CollectionDateField />
                    </form.AppForm>
                  </FormSection>

                  <form.AppForm>
                    <SampleManualGroupsField options={manualGroupOptions} />
                  </form.AppForm>
                </TabsContent>

                <TabsContent value="classification" className="grid gap-4">
                  <FormSection title={m.section_material()}>
                    <form.AppForm>
                      <MaterialField />
                    </form.AppForm>
                    <form.AppForm>
                      <TextureField />
                    </form.AppForm>
                    <form.AppForm>
                      <MetamorphicDetails />
                    </form.AppForm>
                    <form.AppField name="specificName">
                      {(field) => (
                        <field.TextField label={m.field_specific_name()} />
                      )}
                    </form.AppField>
                  </FormSection>

                  <form.AppForm>
                    <SampleEconomicInterestFields />
                  </form.AppForm>

                  {showSynthetic ? (
                    <FormSection title={m.section_synthetic_details()}>
                      <form.AppForm>
                        <SampleSyntheticDetailsFields />
                      </form.AppForm>
                    </FormSection>
                  ) : null}
                </TabsContent>

                <TabsContent value="location" className="grid gap-4">
                  <FormSection title={m.section_location()}>
                    <form.AppForm>
                      <LocationFields />
                    </form.AppForm>
                  </FormSection>

                  <FormSection title={m.section_geomorphological_context()}>
                    <form.AppForm>
                      <SampleGeologicalContextFields />
                    </form.AppForm>
                  </FormSection>
                </TabsContent>

                <TabsContent value="age" className="grid gap-4">
                  <form.AppForm>
                    <AgeFields />
                  </form.AppForm>
                </TabsContent>

                <TabsContent
                  value="physical-description"
                  className="grid gap-4"
                >
                  <FormSection title={m.section_description()}>
                    <form.AppForm>
                      <SampleDescriptionFields />
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

                <TabsContent value="conservation" className="grid gap-4">
                  <FormSection title={m.section_condition()}>
                    <form.AppForm>
                      <SampleConditionFields />
                    </form.AppForm>
                  </FormSection>

                  <FormSection title={m.section_security()}>
                    <form.AppForm>
                      <SampleSecurityFields />
                    </form.AppForm>
                  </FormSection>
                </TabsContent>

                <TabsContent value="curation" className="grid gap-4">
                  <FormSection title={m.section_curation()}>
                    <form.AppForm>
                      <ExistenceStatusField />
                      <AvailabilityStatusField />
                    </form.AppForm>
                    <PublicationYearField value={publicationYear} />
                  </FormSection>

                  <FormSection title={m.section_repository()}>
                    <form.AppForm>
                      <SampleRepositoryFields />
                    </form.AppForm>
                  </FormSection>
                </TabsContent>

                <TabsContent value="related-resources" className="grid gap-6">
                  <form.AppForm>
                    <SampleRelationsFields />
                  </form.AppForm>
                  {sampleId && attachmentChanges ? (
                    <SampleAttachments
                      sampleId={sampleId}
                      attachments={attachments}
                      changes={attachmentChanges}
                    />
                  ) : null}
                </TabsContent>
              </Tabs>
            );
          }}
        </form.Subscribe>

        {attachmentChanges ? (
          <SampleAttachmentUploadDialog changes={attachmentChanges} />
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {m.action_cancel()}
          </Button>
          {secondaryAction ? renderAction(secondaryAction, "outline") : null}
          {statusAction}
          {primaryAction ? renderAction(primaryAction) : null}
        </div>
      </form>
    </FieldDisabledProvider>
  );
}
