import { embargoPublicationDateSchema } from "@projet-igsn/domain/sample/publication/embargo-publication-date";

import type { SampleConfirmation } from "#/samples/use-sample-form-submit.ts";

import { DuplicateSamplesDialog } from "#/samples/duplicate-samples-dialog.tsx";
import { PublicationDateField } from "#/samples/publication-date-field.tsx";

export function SampleConfirmDialog({
  confirming,
  setConfirming,
}: {
  confirming: SampleConfirmation;
  setConfirming: (confirming: SampleConfirmation | null) => void;
}) {
  return (
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
        !embargoPublicationDateSchema.safeParse(confirming.publishedAt).success
      }
      onConfirm={() => {
        const { onConfirm, publishedAt } = confirming;
        setConfirming(null);
        onConfirm(publishedAt);
      }}
      onCancel={() => setConfirming(null)}
    />
  );
}
