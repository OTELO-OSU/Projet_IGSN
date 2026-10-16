import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { User } from "@projet-igsn/domain/user/model";
import type { ReactNode } from "react";

import { FieldAdornmentProvider } from "@projet-igsn/design-system/components/form/field-adornment-context";
import { FieldDisabledProvider } from "@projet-igsn/design-system/components/form/field-disabled-context";
import { FieldRequiredProvider } from "@projet-igsn/design-system/components/form/field-required-context";
import {
  type FieldSuggestionRule,
  FieldSuggestionProvider,
  NO_FIELD_SUGGESTIONS,
} from "@projet-igsn/design-system/components/form/field-suggestion-context";
import { FormSection } from "@projet-igsn/design-system/components/form/form-section";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tabs,
  TabsContent,
} from "@projet-igsn/design-system/components/ui/tabs";
import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { type SampleParent } from "@projet-igsn/domain/sample/parent/model";
import { soleParent } from "@projet-igsn/domain/sample/parent/sole-parent";
import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import {
  type SampleStatus,
  type SynchronizationStatus,
} from "@projet-igsn/domain/sample/sample";
import { type SampleSeries } from "@projet-igsn/domain/sample/series/model";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";
import { useState } from "react";

import type { SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";

import { m } from "#/paraglide/messages.js";
import { AgeFields } from "#/samples/age-fields.tsx";
import { keptAttachmentMetadata } from "#/samples/attachment-metadata.ts";
import {
  AvailabilityStatusField,
  ExistenceStatusField,
} from "#/samples/curation-fields.tsx";
import { FieldLock } from "#/samples/field-lock.tsx";
import { hasUnsavedAttachmentChanges } from "#/samples/has-unsaved-attachment-changes.ts";
import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";
import { resolveSampleFrozenFields } from "#/samples/resolve-sample-frozen-fields.ts";
import { SampleAttachmentUploadDialog } from "#/samples/sample-attachment-upload-dialog.tsx";
import { SampleClassificationTab } from "#/samples/sample-classification-tab.tsx";
import { SampleConditionFields } from "#/samples/sample-condition-fields.tsx";
import { SampleConfirmDialog } from "#/samples/sample-confirm-dialog.tsx";
import { SampleDescriptionFields } from "#/samples/sample-description-fields.tsx";
import {
  publishedEditDraftSchema,
  sampleDraftSchema,
  type SampleDraftSource,
  toSampleDraft,
} from "#/samples/sample-draft-schema.ts";
import {
  type SampleFormAction,
  SampleFormActionButton,
  type SampleFormActionContext,
} from "#/samples/sample-form-action-button.tsx";
import { SampleFormTabList } from "#/samples/sample-form-tab-list.tsx";
import {
  isSampleFormTabDisabled,
  type SampleFormTab,
  tabCompleteness,
} from "#/samples/sample-form-tabs.ts";
import { SampleIdentityTab } from "#/samples/sample-identity-tab.tsx";
import { SampleLocationTab } from "#/samples/sample-location-tab.tsx";
import { SampleParentTab } from "#/samples/sample-parent-tab.tsx";
import { samplePublishInput } from "#/samples/sample-publish-input.ts";
import { SampleRelatedResourcesTab } from "#/samples/sample-related-resources-tab.tsx";
import { SampleRepositoryFields } from "#/samples/sample-repository-fields.tsx";
import { sampleRequiredFields } from "#/samples/sample-required-fields.ts";
import { SampleScientificContextFields } from "#/samples/sample-scientific-context-fields.tsx";
import { SampleSecurityFields } from "#/samples/sample-security-fields.tsx";
import { UnsavedChangesGuard } from "#/samples/unsaved-changes-guard.tsx";
import { useSampleFormSubmit } from "#/samples/use-sample-form-submit.ts";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";
import { validateSampleDraft } from "#/samples/validate-sample-draft.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

const DEFAULT_TAB: SampleFormTab = "identity";

export type SampleFormParent = Omit<SampleParent, "id">;

export type SampleFormProps = {
  onCancel: () => void;
  isPending?: boolean;
  defaultValues?: SampleDraftSource;
  defaultContactUserId?: string;
  parents?: SampleFormParent[];
  storedChildren?: SampleParent[];
  storedSeries?: SampleSeries | null;
  hasSubSamples?: boolean;
  canAddParent?: boolean;
  fieldSuggestions?: FieldSuggestionRule;
  status?: SampleStatus;
  synchronizationStatus?: SynchronizationStatus | null;
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
  storedSeries = null,
  hasSubSamples = false,
  canAddParent = false,
  fieldSuggestions = NO_FIELD_SUGGESTIONS,
  status = "draft",
  synchronizationStatus = null,
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
  const validate = validateSampleDraft(
    wasPublished
      ? publishedEditDraftSchema(existingBlockers)
      : sampleDraftSchema,
  );
  const isReadOnly = readOnlyReason !== undefined;
  const { isFieldFrozen, isFrozenByPublication } = resolveSampleFrozenFields({
    isReadOnly,
    wasPublished,
    currentUser,
    provenanceStatus:
      defaultValues?.scientificContext?.provenanceStatus ?? null,
    material: defaultValues?.material ?? null,
    roleOnSample,
    parents,
  });
  const onlyParent = soleParent(parents);
  const hasParentTab = parents.length > 0 || sampleId !== undefined;
  const offersParentPicker = parents.length === 0 && canAddParent;
  const defaultSubmit =
    primaryAction?.kind === "submit"
      ? primaryAction.onSubmit
      : secondaryAction?.kind === "submit"
        ? secondaryAction.onSubmit
        : undefined;

  const keptAttachments = keptAttachmentMetadata(
    attachments,
    attachmentChanges,
  );
  const {
    form,
    confirming,
    setConfirming,
    askPublish,
    submitWith,
    isCheckingDuplicates,
  } = useSampleFormSubmit({
    defaultValues,
    defaultContactUserId,
    defaultSubmit,
    wasPublished,
    sampleId,
    validate,
    tab,
    setTab,
    keptAttachments,
    attachments,
    attachmentChanges,
  });

  const actionContext: SampleFormActionContext = {
    gate: {
      keptAttachments,
      existingBlockers,
      currentUser,
      isDisabled: isReadOnly || (isPending ?? false),
    },
    canPublish: roleOnSample === null || isSampleEditor(roleOnSample),
    wasPublished,
    isCheckingDuplicates,
    askPublish,
    submitWith,
    sampleId,
    status,
    synchronizationStatus,
    readOnlyReason,
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
              const isLocked = wasPublished
                ? isFrozenByPublication
                : publishedSampleFrozenField(
                    provenanceStatus ?? null,
                    material,
                  );
              const isTabDisabled = (value: SampleFormTab) =>
                isSampleFormTabDisabled(value, {
                  hasParentTab,
                  material,
                  hasSoleParent: onlyParent !== undefined,
                  parentIds: values.parentIds,
                  provenanceStatus,
                });
              return (
                // ponytail: a new rule per change re-renders every mounted kit field; pass a joined-names string as its dependency if typing lags.
                <FieldRequiredProvider
                  value={(name) =>
                    required.some((field) => field.name === name)
                  }
                >
                  <FieldAdornmentProvider
                    value={(name) =>
                      isLocked(name) ? (
                        <FieldLock
                          isClosed={wasPublished}
                          text={
                            wasPublished
                              ? m.field_locked_since_publication()
                              : m.field_locked_after_publication()
                          }
                        />
                      ) : null
                    }
                  >
                    <form.AppForm>
                      <Tabs
                        className="*:data-[slot=tabs-content]:px-9"
                        value={isTabDisabled(tab) ? DEFAULT_TAB : tab}
                        onValueChange={(value) =>
                          setTab(value as SampleFormTab)
                        }
                      >
                        <SampleFormTabList
                          parentCount={parents.length}
                          hasParentTab={hasParentTab}
                          completeness={tabCompleteness(required)}
                          isTabDisabled={isTabDisabled}
                        />

                        {hasParentTab ? (
                          <TabsContent value="parent" className="grid gap-4">
                            <SampleParentTab
                              parents={parents}
                              sampleId={sampleId}
                              offersParentPicker={offersParentPicker}
                            />
                          </TabsContent>
                        ) : null}

                        <TabsContent value={DEFAULT_TAB} className="grid gap-4">
                          <SampleIdentityTab
                            parents={parents}
                            hasSubSamples={hasSubSamples}
                            storedSeries={storedSeries}
                            storedChildren={storedChildren}
                            manualGroupOptions={manualGroupOptions}
                            sampleId={sampleId}
                            status={status}
                          />
                        </TabsContent>

                        <TabsContent
                          value="classification"
                          className="grid gap-4"
                        >
                          <SampleClassificationTab material={material} />
                        </TabsContent>

                        <TabsContent value="location" className="grid gap-4">
                          <SampleLocationTab onlyParent={onlyParent} />
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

                        <TabsContent
                          value="conservation"
                          className="grid gap-4"
                        >
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
                          <SampleRelatedResourcesTab
                            sampleId={sampleId}
                            attachments={attachments}
                            attachmentChanges={attachmentChanges}
                          />
                        </TabsContent>
                      </Tabs>
                    </form.AppForm>
                  </FieldAdornmentProvider>
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

          <form.AppForm>
            <div className="bg-background fixed inset-x-0 bottom-0 z-40 flex flex-wrap justify-end gap-2 border-t px-15 py-3 md:left-(--sidebar-width) md:duration-500 md:ease-in-out md:motion-safe:transition-[left]">
              <Button type="button" variant="ghost" onClick={onCancel}>
                {m.action_cancel()}
              </Button>
              {secondaryAction ? (
                <SampleFormActionButton
                  action={secondaryAction}
                  variant="outline"
                  context={actionContext}
                />
              ) : null}
              {statusAction}
              {primaryAction ? (
                <SampleFormActionButton
                  action={primaryAction}
                  context={actionContext}
                />
              ) : null}
            </div>
          </form.AppForm>

          {confirming ? (
            <SampleConfirmDialog
              confirming={confirming}
              setConfirming={setConfirming}
            />
          ) : null}
        </form>
      </FieldSuggestionProvider>
    </FieldDisabledProvider>
  );
}
