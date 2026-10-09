import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { SuspectedDuplicate } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";
import type { User } from "@projet-igsn/domain/user/model";
import type { ReactNode } from "react";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FieldRequiredProvider } from "@projet-igsn/design-system/components/form/field-required-context";
import {
  type FieldSuggestionRule,
  FieldSuggestionProvider,
  NO_FIELD_SUGGESTIONS,
} from "@projet-igsn/design-system/components/form/field-suggestion-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import { toComboboxItems } from "@projet-igsn/design-system/components/ui/combobox";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import {
  Tabs,
  TabsContent,
} from "@projet-igsn/design-system/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";
import { natureSchema } from "@projet-igsn/domain/sample/nature";
import { type SampleParent } from "@projet-igsn/domain/sample/parent/model";
import { soleParent } from "@projet-igsn/domain/sample/parent/sole-parent";
import { canSetSampleChildren } from "@projet-igsn/domain/sample/publication/can-set-sample-children";
import { embargoPublicationDateSchema } from "@projet-igsn/domain/sample/publication/embargo-publication-date";
import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { duplicateCheckCriteria } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import {
  type CreateSample,
  type SampleStatus,
} from "@projet-igsn/domain/sample/sample";
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { canBecomeSeries } from "@projet-igsn/domain/sample/type/can-become-series";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";
import { canEditFrozenSampleFields } from "@projet-igsn/domain/user/can-edit-frozen-sample-fields";
import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";

import { frontendSampleUrl } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { AgeFields } from "#/samples/age-fields.tsx";
import { CollectionDateField } from "#/samples/collection-date-field.tsx";
import { CollectionMethodField } from "#/samples/collection-method-field.tsx";
import {
  ConfirmMenuButton,
  type ConfirmMenuAction,
} from "#/samples/confirm-menu-button.tsx";
import {
  AvailabilityStatusField,
  ExistenceStatusField,
} from "#/samples/curation-fields.tsx";
import { DuplicateSamplesDialog } from "#/samples/duplicate-samples-dialog.tsx";
import { hasUnsavedAttachmentChanges } from "#/samples/has-unsaved-attachment-changes.ts";
import { LocalIdFields } from "#/samples/local-id-fields.tsx";
import { LocationFields } from "#/samples/location-fields.tsx";
import { ProvenanceStatusField } from "#/samples/provenance-status-field.tsx";
import { PublicationDateField } from "#/samples/publication-date-field.tsx";
import { publishBlockerLines } from "#/samples/publish-blocker-field-label.ts";
import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";
import { SampleAttachmentUploadDialog } from "#/samples/sample-attachment-upload-dialog.tsx";
import { SampleAttachments } from "#/samples/sample-attachments.tsx";
import { SampleChildrenField } from "#/samples/sample-children-field.tsx";
import { SampleClassificationTab } from "#/samples/sample-classification-tab.tsx";
import { SampleConditionFields } from "#/samples/sample-condition-fields.tsx";
import { SampleDescriptionFields } from "#/samples/sample-description-fields.tsx";
import { sampleDraftFieldErrors } from "#/samples/sample-draft-field-errors.ts";
import {
  publishedEditDraftSchema,
  type SampleDraft,
  sampleDraftSchema,
  toSampleDraft,
} from "#/samples/sample-draft-schema.ts";
import { SampleFormTabList } from "#/samples/sample-form-tab-list.tsx";
import {
  parentTabLabel,
  SAMPLE_FORM_TABS,
  sampleFieldTab,
  type SampleFormTab,
  tabCompleteness,
} from "#/samples/sample-form-tabs.ts";
import { SampleGeologicalContextFields } from "#/samples/sample-geological-context-fields.tsx";
import { natureLabel } from "#/samples/sample-labels.ts";
import { SampleManualGroupsField } from "#/samples/sample-manual-groups-field.tsx";
import { SampleProcessStepsFields } from "#/samples/sample-process-steps-fields.tsx";
import { samplePublishInput } from "#/samples/sample-publish-input.ts";
import { SampleRelationsFields } from "#/samples/sample-relations-fields.tsx";
import { SampleRepositoryFields } from "#/samples/sample-repository-fields.tsx";
import {
  sampleRequiredFields,
  saveRequiredFields,
} from "#/samples/sample-required-fields.ts";
import { SampleScientificContextFields } from "#/samples/sample-scientific-context-fields.tsx";
import { SampleSecurityFields } from "#/samples/sample-security-fields.tsx";
import { SampleSubmitButton } from "#/samples/sample-submit-button.tsx";
import { SampleTypeFields } from "#/samples/sample-type-fields.tsx";
import { UnsavedChangesGuard } from "#/samples/unsaved-changes-guard.tsx";
import {
  keptAttachmentMetadata,
  type SampleAttachmentChanges,
} from "#/samples/use-attachment-changes.ts";
import { useCheckSampleDuplicates } from "#/samples/use-check-sample-duplicates.ts";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";
import { withDefaultContacts } from "#/samples/with-default-contacts.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

const DEFAULT_TAB: SampleFormTab = "identity";

const natureItems = toComboboxItems(natureSchema.options, natureLabel);

export type SampleFormParent = Omit<SampleParent, "id">;

function ParentSampleLink({ parent }: { parent: SampleFormParent }) {
  return (
    <a
      className="text-foreground underline underline-offset-2"
      href={frontendSampleUrl(parent.igsn)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {parent.name}
    </a>
  );
}

function ParentSampleField({
  parent,
  label,
}: {
  parent: SampleFormParent;
  label: string;
}) {
  const id = `parent-${parent.igsn}`;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid w-full gap-2 sm:w-72">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} value={parent.name} disabled />
      </div>
      <Button asChild variant="outline">
        <a
          href={frontendSampleUrl(parent.igsn)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={m.action_see_parent_named({ name: parent.name })}
        >
          <ExternalLinkIcon aria-hidden />
          {m.action_see_parent()}
        </a>
      </Button>
    </div>
  );
}

const validateDraft =
  (schema: typeof sampleDraftSchema) =>
  ({ value }: { value: SampleDraft }) => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? undefined
      : { fields: sampleDraftFieldErrors(parsed.error.issues) };
  };

export type SampleSubmitMenu = {
  label: string;
  items: SampleSubmitMenuItem[];
};

export type SampleSubmitMenuItem = Omit<ConfirmMenuAction, "onConfirm"> & {
  onConfirm: (value: CreateSample) => void | Promise<unknown>;
};

type SamplePublish = (
  value: CreateSample,
  status: PublishStatus,
  publishedAt?: string,
) => void | Promise<unknown>;

const PUBLISH_TEXT: Record<
  PublishStatus,
  { title: () => string; description: () => string }
> = {
  published: {
    title: m.publish_sample_title,
    description: m.publish_sample_warning,
  },
  withdrawn: {
    title: m.publish_withdrawn_sample_title,
    description: m.publish_withdrawn_sample_warning,
  },
  embargo: {
    title: m.publish_embargo_sample_title,
    description: m.publish_embargo_sample_warning,
  },
};

export type SampleFormAction =
  | {
      kind: "submit";
      label: string;
      onSubmit: (value: CreateSample) => void | Promise<unknown>;
      menu?: SampleSubmitMenu;
    }
  | {
      kind: "publish";
      label: string;
      disabled?: boolean;
      onPublish: SamplePublish;
    }
  | { kind: "link"; label: string; href: string };

type SubmitMeta = {
  onValid: ((value: CreateSample) => void | Promise<unknown>) | undefined;
  checkDuplicates: boolean;
};

export type SampleFormProps = {
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: Partial<CreateSample>;
  defaultContactUserId?: string;
  parents?: SampleFormParent[];
  storedChildren?: SampleParent[];
  hasSubSamples?: boolean;
  fieldSuggestions?: FieldSuggestionRule;
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
  defaultTab?: SampleFormTab;
  onTabChange?: (tab: SampleFormTab) => void;
};

export function SampleForm({
  onCancel,
  isPending,
  defaultValues,
  defaultContactUserId,
  parents = [],
  storedChildren,
  hasSubSamples = false,
  fieldSuggestions = NO_FIELD_SUGGESTIONS,
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
  defaultTab = DEFAULT_TAB,
  onTabChange,
}: SampleFormProps) {
  const [tab, setTabState] = useState(defaultTab);
  const setTab = (next: SampleFormTab) => {
    setTabState(next);
    onTabChange?.(next);
  };
  const roleOnSample = useUserRoleOnSample(sampleId);
  const wasPublished = hasPermanentIgsn({ status });
  const existingBlockers = wasPublished
    ? samplePublishBlockers(
        samplePublishInput(toSampleDraft(defaultValues), attachments),
        UPLOAD_LIMIT,
      )
    : [];
  const validate = validateDraft(
    wasPublished
      ? publishedEditDraftSchema(existingBlockers)
      : sampleDraftSchema,
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
  const onlyParent = soleParent(parents);
  const isMaterialFrozenByParent =
    onlyParent !== undefined && isSyntheticMaterial(onlyParent.material);
  const hasTwoParents = parents.length > 1;
  const isFieldFrozen = isReadOnly
    ? () => true
    : (name: string) =>
        isFrozenByPublication(name) ||
        name === "materialPath[0]" ||
        (name === "manualGroupIds" && areManualGroupsFrozen) ||
        (isMaterialFrozenByParent && name.startsWith("materialPath")) ||
        (hasTwoParents && name === "materialPath[1]");
  const defaultSubmit =
    primaryAction?.kind === "submit"
      ? primaryAction.onSubmit
      : secondaryAction?.kind === "submit"
        ? secondaryAction.onSubmit
        : undefined;
  const checkDuplicates = useCheckSampleDuplicates();
  const [confirming, setConfirming] = useState<{
    duplicates: SuspectedDuplicate[];
    title?: string;
    description?: string;
    note?: string;
    publishedAt?: string;
    onConfirm: (publishedAt?: string) => void;
  } | null>(null);
  const findDuplicates = async (value: CreateSample) => {
    const criteria = duplicateCheckCriteria(value, {
      previous: wasPublished ? defaultValues : null,
    });
    if (criteria === null) return [];
    return checkDuplicates
      .mutateAsync({ ...criteria, exclude: sampleId })
      .catch(() => null);
  };
  const askPublish = async (
    status: PublishStatus,
    onPublish: SamplePublish,
  ) => {
    const parsed = sampleDraftSchema.safeParse(form.state.values);
    const duplicates = parsed.success ? await findDuplicates(parsed.data) : [];
    if (duplicates === null) return;
    setConfirming({
      duplicates,
      title: PUBLISH_TEXT[status].title(),
      description: PUBLISH_TEXT[status].description(),
      note:
        duplicates.length > 0 ? m.duplicate_samples_description() : undefined,
      publishedAt: status === "embargo" ? "" : undefined,
      onConfirm: (publishedAt) =>
        void form.handleSubmit({
          onValid: (value) => onPublish(value, status, publishedAt),
          checkDuplicates: false,
        }),
    });
  };

  const keptAttachments = keptAttachmentMetadata(
    attachments,
    attachmentChanges,
  );
  const form = useAppForm({
    defaultValues: withDefaultContacts(
      toSampleDraft(defaultValues),
      defaultContactUserId,
    ),
    onSubmitMeta: {
      onValid: defaultSubmit,
      checkDuplicates: wasPublished,
    } as SubmitMeta,
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
    onSubmitInvalid: ({ formApi }) => {
      const invalidTabs = Object.entries(formApi.state.fieldMeta)
        .filter(([, meta]) => (meta?.errors.length ?? 0) > 0)
        .map(([name]) => sampleFieldTab(name));
      const first = SAMPLE_FORM_TABS.find(({ value }) =>
        invalidTabs.includes(value),
      );
      if (first && first.value !== tab) {
        flushSync(() => setTab(first.value));
        void formApi.validate("submit");
      }
      toast.error(m.sample_save_invalid());
    },
    onSubmit: async ({ value, meta, formApi }) => {
      const parsed = sampleDraftSchema.safeParse(value);
      if (!parsed.success) return;
      if (keptAttachments.length > UPLOAD_LIMIT) {
        toast.error(m.sample_save_attachment_limit({ limit: UPLOAD_LIMIT }));
        return;
      }
      if (meta.checkDuplicates) {
        const duplicates = await findDuplicates(parsed.data);
        if (duplicates === null) return;
        if (duplicates.length > 0) {
          setConfirming({
            duplicates,
            onConfirm: () =>
              void form.handleSubmit({
                onValid: meta.onValid,
                checkDuplicates: false,
              }),
          });
          return;
        }
      }
      const committed = attachmentChanges
        ? await attachmentChanges.commit(attachments)
        : undefined;
      const isSaved = await Promise.resolve(
        meta.onValid?.(
          committed ? { ...parsed.data, attachments: committed } : parsed.data,
        ),
      ).then(
        () => true,
        () => false,
      );
      if (isSaved) formApi.reset(toSampleDraft(parsed.data));
    },
  });

  const renderPublishGated = (
    renderButton: (disabled: boolean) => ReactNode,
  ) => (
    <form.Subscribe
      selector={(state) => ({
        canSubmit: state.canSubmit,
        values: state.values,
      })}
    >
      {({ canSubmit, values }) => {
        const reasons = publishBlockerLines(
          samplePublishBlockers(
            samplePublishInput(values, keptAttachments),
            UPLOAD_LIMIT,
            currentUser,
          ).filter((blocker) => !existingBlockers.includes(blocker)),
          saveRequiredFields(values).filter(({ isMet }) => !isMet),
        );
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
                {reasons.map(({ key, line }) => (
                  <li key={key}>{line}</li>
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
      return renderPublishGated((gated) => {
        const disabled =
          gated || action.disabled === true || checkDuplicates.isPending;
        return (
          <div className="flex">
            <Button
              type="button"
              className="rounded-r-none"
              disabled={disabled}
              onClick={() => void askPublish("published", action.onPublish)}
            >
              {action.label}
            </Button>
            <ConfirmMenuButton
              label={m.action_publish_options()}
              className="border-l-primary-foreground/30 rounded-l-none border-l"
              disabled={disabled}
              items={[
                {
                  label: m.action_withdraw(),
                  onSelect: () =>
                    void askPublish("withdrawn", action.onPublish),
                },
                {
                  label: m.action_publish_with_embargo(),
                  onSelect: () => void askPublish("embargo", action.onPublish),
                },
              ]}
            />
          </div>
        );
      });
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
                  void form.handleSubmit({
                    onValid: item.onConfirm,
                    checkDuplicates: false,
                  }),
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
      <FieldSuggestionProvider value={fieldSuggestions}>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
          className="flex flex-col gap-6 pb-20"
        >
          <form.Subscribe selector={(state) => state.values}>
            {(values) => {
              const material = composeHierarchyValue(values.materialPath);
              const provenanceStatus =
                values.scientificContext.provenanceStatus;
              const required = sampleRequiredFields(values, keptAttachments);
              const isTabDisabled = (value: SampleFormTab) =>
                (value === "parent" && parents.length === 0) ||
                (value === "location" && !allowsLocation(material)) ||
                (value === "scientific-context" && !provenanceStatus);
              return (
                // ponytail: a new rule per change re-renders every mounted kit field; pass a joined-names string as its dependency if typing lags.
                <FieldRequiredProvider
                  value={(name) =>
                    required.some((field) => field.name === name)
                  }
                >
                  <form.AppForm>
                    <Tabs
                      className="*:data-[slot=tabs-content]:px-9"
                      value={isTabDisabled(tab) ? DEFAULT_TAB : tab}
                      onValueChange={(value) => setTab(value as SampleFormTab)}
                    >
                      <SampleFormTabList
                        parentCount={parents.length}
                        completeness={tabCompleteness(required)}
                        isTabDisabled={isTabDisabled}
                      />

                      {parents.length > 0 ? (
                        <TabsContent value="parent" className="grid gap-4">
                          <FormSection title={parentTabLabel(parents.length)}>
                            {parents.map((each, index) => (
                              <ParentSampleField
                                key={each.igsn}
                                parent={each}
                                label={
                                  parents.length > 1
                                    ? m.field_parent_numbered({
                                        index: index + 1,
                                      })
                                    : m.field_parent()
                                }
                              />
                            ))}
                          </FormSection>
                        </TabsContent>
                      ) : null}

                      <TabsContent value={DEFAULT_TAB} className="grid gap-4">
                        <FormSection title={m.section_sample()}>
                          <form.AppField name="name">
                            {(field) => (
                              <field.TextField label={m.field_name()} />
                            )}
                          </form.AppField>

                          <LocalIdFields />

                          <SampleTypeFields
                            canBeSeries={canBecomeSeries({
                              parents,
                              hasSubSamples,
                            })}
                          />

                          <form.AppField name="nature">
                            {(field) => (
                              <field.ComboboxField
                                label={m.field_nature()}
                                items={natureItems}
                                placeholder={m.nature_placeholder()}
                                searchPlaceholder={m.nature_search_placeholder()}
                                emptyText={m.nature_empty()}
                              />
                            )}
                          </form.AppField>

                          <CollectionMethodField />

                          <ProvenanceStatusField />

                          {parents.length === 0 ? (
                            <CollectionDateField />
                          ) : null}
                        </FormSection>

                        {parents.length > 0 ? (
                          <SampleProcessStepsFields />
                        ) : null}

                        <SampleManualGroupsField options={manualGroupOptions} />

                        <SampleChildrenField
                          sampleId={sampleId}
                          storedChildren={storedChildren}
                          canSetChildren={canSetSampleChildren({ status })}
                        />
                      </TabsContent>

                      <TabsContent
                        value="classification"
                        className="grid gap-4"
                      >
                        <SampleClassificationTab material={material} />
                      </TabsContent>

                      <TabsContent value="location" className="grid gap-4">
                        {onlyParent && allowsLocation(onlyParent.material) ? (
                          <FormSection
                            title={m.section_location()}
                            description={
                              <>
                                {m.location_inherited_from()}{" "}
                                <ParentSampleLink parent={onlyParent} />
                              </>
                            }
                          />
                        ) : (
                          <>
                            <FormSection title={m.section_location()}>
                              <LocationFields />
                            </FormSection>

                            <FormSection title={m.section_geological_context()}>
                              <SampleGeologicalContextFields />
                            </FormSection>
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="age" className="grid gap-4">
                        <AgeFields />
                      </TabsContent>

                      <TabsContent
                        value="physical-description"
                        className="grid gap-4"
                      >
                        <FormSection title={m.section_description()}>
                          <SampleDescriptionFields />
                        </FormSection>
                      </TabsContent>

                      <TabsContent
                        value="scientific-context"
                        className="grid gap-4"
                      >
                        <SampleScientificContextFields />
                      </TabsContent>

                      <TabsContent value="conservation" className="grid gap-4">
                        <FormSection title={m.section_condition()}>
                          <SampleConditionFields />
                        </FormSection>

                        <FormSection title={m.section_security()}>
                          <SampleSecurityFields />
                        </FormSection>
                      </TabsContent>

                      <TabsContent value="curation" className="grid gap-4">
                        <FormSection title={m.section_curation()}>
                          <ExistenceStatusField />
                          <AvailabilityStatusField />
                        </FormSection>

                        <FormSection title={m.section_repository()}>
                          <SampleRepositoryFields />
                        </FormSection>
                      </TabsContent>

                      <TabsContent
                        value="related-resources"
                        className="grid gap-6"
                      >
                        <SampleRelationsFields />
                        {sampleId && attachmentChanges ? (
                          <SampleAttachments
                            sampleId={sampleId}
                            attachments={attachments}
                            changes={attachmentChanges}
                          />
                        ) : (
                          <FormSection
                            title={m.section_attachments()}
                            description={m.attachments_unsaved_hint()}
                          />
                        )}
                      </TabsContent>
                    </Tabs>
                  </form.AppForm>
                </FieldRequiredProvider>
              );
            }}
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.isDefaultValue}>
            {(isDefaultValue) => (
              <UnsavedChangesGuard
                isDirty={
                  !isReadOnly &&
                  (!isDefaultValue ||
                    (attachmentChanges !== undefined &&
                      hasUnsavedAttachmentChanges(
                        attachments,
                        attachmentChanges,
                      )))
                }
              />
            )}
          </form.Subscribe>

          {attachmentChanges ? (
            <SampleAttachmentUploadDialog changes={attachmentChanges} />
          ) : null}

          <div className="bg-background fixed inset-x-0 bottom-0 z-40 flex flex-wrap justify-end gap-2 border-t px-15 py-3 md:left-(--sidebar-width) md:duration-500 md:ease-in-out md:motion-safe:transition-[left]">
            <Button type="button" variant="ghost" onClick={onCancel}>
              {m.action_cancel()}
            </Button>
            {secondaryAction ? renderAction(secondaryAction, "outline") : null}
            {statusAction}
            {primaryAction ? renderAction(primaryAction) : null}
          </div>

          {confirming ? (
            <DuplicateSamplesDialog
              {...confirming}
              body={
                confirming.publishedAt === undefined ? null : (
                  <PublicationDateField
                    value={confirming.publishedAt}
                    onChange={(publishedAt) =>
                      setConfirming({ ...confirming, publishedAt })
                    }
                  />
                )
              }
              confirmDisabled={
                confirming.publishedAt !== undefined &&
                !embargoPublicationDateSchema.safeParse(confirming.publishedAt)
                  .success
              }
              onConfirm={() => {
                const { onConfirm, publishedAt } = confirming;
                setConfirming(null);
                onConfirm(publishedAt);
              }}
              onCancel={() => setConfirming(null)}
            />
          ) : null}
        </form>
      </FieldSuggestionProvider>
    </FieldDisabledProvider>
  );
}
