import type { SuspectedDuplicate } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import type { ReactNode } from "react";

import { ConfirmDialog } from "#/confirm-button.tsx";
import { m } from "#/paraglide/messages.js";
import { SuspectedDuplicatesList } from "#/samples/suspected-duplicates-list.tsx";

export function DuplicateSamplesDialog({
  duplicates,
  title = m.duplicate_samples_title(),
  description = m.duplicate_samples_description(),
  note,
  body,
  confirmDisabled,
  onConfirm,
  onCancel,
}: {
  duplicates: SuspectedDuplicate[];
  title?: string;
  description?: string;
  note?: string;
  body?: ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const suspected = duplicates.length > 0;
  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => (next ? undefined : onCancel())}
      title={title}
      description={description}
      confirmLabel={suspected ? m.duplicate_samples_confirm() : undefined}
      confirmDisabled={confirmDisabled}
      onConfirm={onConfirm}
      body={
        <>
          {suspected ? (
            <SuspectedDuplicatesList duplicates={duplicates} note={note} />
          ) : null}
          {body}
        </>
      }
    />
  );
}
