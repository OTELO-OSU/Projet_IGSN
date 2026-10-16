import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { FormSection } from "@projet-igsn/design-system/components/form/form-section";

import type { SampleAttachmentChanges } from "#/samples/use-attachment-changes.ts";

import { m } from "#/paraglide/messages.js";
import { SampleAttachments } from "#/samples/sample-attachments.tsx";
import { SampleRelationsFields } from "#/samples/sample-relations-fields.tsx";

export function SampleRelatedResourcesTab({
  sampleId,
  attachments,
  attachmentChanges,
}: {
  sampleId: string | undefined;
  attachments: SampleAttachment[];
  attachmentChanges: SampleAttachmentChanges | undefined;
}) {
  return (
    <>
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
    </>
  );
}
