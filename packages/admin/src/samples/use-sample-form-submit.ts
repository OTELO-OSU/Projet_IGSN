import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";
import type { SuspectedDuplicate } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { duplicateCheckCriteria } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import { useState } from "react";
import { flushSync } from "react-dom";

import type { AttachmentMetadata } from "#/samples/attachment-metadata.ts";
import type { SamplePublish } from "#/samples/sample-form-action-button.tsx";
import type { SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";
import type { validateSampleDraft } from "#/samples/validate-sample-draft.ts";

import { m } from "#/paraglide/messages.js";
import { keepTouchedFieldErrors } from "#/samples/keep-touched-field-errors.ts";
import {
  sampleDraftSchema,
  type SampleDraftSource,
  toSampleDraft,
} from "#/samples/sample-draft-schema.ts";
import {
  SAMPLE_FORM_TABS,
  sampleFieldTab,
  type SampleFormTab,
} from "#/samples/sample-form-tabs.ts";
import { useCheckSampleDuplicates } from "#/samples/use-check-sample-duplicates.ts";
import { withDefaultContacts } from "#/samples/with-default-contacts.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

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

type SubmitMeta = {
  onValid: ((value: CreateSample) => void | Promise<unknown>) | undefined;
  checkDuplicates: boolean;
};

export type SampleConfirmation = {
  duplicates: SuspectedDuplicate[];
  title?: string;
  description?: string;
  note?: string;
  publishedAt?: string;
  onConfirm: (publishedAt?: string) => void;
};

export function useSampleFormSubmit({
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
}: {
  defaultValues: SampleDraftSource | undefined;
  defaultContactUserId: string | undefined;
  defaultSubmit: SubmitMeta["onValid"];
  wasPublished: boolean;
  sampleId: string | undefined;
  validate: ReturnType<typeof validateSampleDraft>;
  tab: SampleFormTab;
  setTab: (next: SampleFormTab) => void;
  keptAttachments: AttachmentMetadata[];
  attachments: SampleAttachment[];
  attachmentChanges: SampleAttachmentChanges | undefined;
}) {
  const checkDuplicates = useCheckSampleDuplicates();
  const [confirming, setConfirming] = useState<SampleConfirmation | null>(null);
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
        return keepTouchedFieldErrors(
          result,
          context.formApi.state.fieldMeta as Record<
            string,
            { isTouched: boolean } | undefined
          >,
        );
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

  const submitWith = (onValid: SubmitMeta["onValid"]) =>
    void form.handleSubmit({ onValid, checkDuplicates: false });

  return {
    form,
    confirming,
    setConfirming,
    askPublish,
    submitWith,
    isCheckingDuplicates: checkDuplicates.isPending,
  };
}
