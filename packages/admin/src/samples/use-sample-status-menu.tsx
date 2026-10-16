import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import { embargoPublicationDateSchema } from "@projet-igsn/domain/sample/publication/embargo-publication-date";
import { useState } from "react";

import type { SampleSubmitMenuItem } from "#/samples/sample-form-action-button.tsx";
import type { useSetSampleStatus } from "#/samples/use-set-sample-status.ts";
import type { useUpdateSample } from "#/samples/use-update-sample.ts";

import { m } from "#/paraglide/messages.js";
import { PublicationDateField } from "#/samples/publication-date-field.tsx";

export function useSampleStatusMenu({
  status,
  can,
  updateSample,
  setStatus,
  onLeave,
}: {
  status: SampleStatus;
  can: (to: SetSampleStatusBody["status"]) => boolean;
  updateSample: ReturnType<typeof useUpdateSample>;
  setStatus: ReturnType<typeof useSetSampleStatus>;
  onLeave: () => void;
}): SampleSubmitMenuItem[] {
  const [publicationDate, setPublicationDate] = useState("");
  const withdrawItem: SampleSubmitMenuItem = {
    label: m.action_withdraw(),
    title: m.withdraw_sample_title(),
    description: m.withdraw_sample_warning(),
    onConfirm: (value) =>
      updateSample
        .mutateAsync(value)
        .then(() => setStatus.mutate({ status: "withdrawn" })),
  };
  const tombstoneItem: SampleSubmitMenuItem = {
    label: m.action_tombstone(),
    title: m.tombstone_sample_title(),
    description: m.tombstone_sample_warning(),
    onConfirm: (value) =>
      updateSample.mutateAsync(value).then(() =>
        setStatus.mutate(
          { status: "tombstone" },
          {
            onSuccess: onLeave,
          },
        ),
      ),
  };
  const changePublicationDateItem: SampleSubmitMenuItem = {
    label: m.action_change_publication_date(),
    title: m.change_publication_date_title(),
    description: m.change_publication_date_warning(),
    body: (
      <PublicationDateField
        value={publicationDate}
        onChange={setPublicationDate}
      />
    ),
    confirmDisabled:
      !embargoPublicationDateSchema.safeParse(publicationDate).success,
    onConfirm: (value) =>
      updateSample
        .mutateAsync(value)
        .then(() =>
          setStatus.mutate({ status: "embargo", publishedAt: publicationDate }),
        ),
  };
  return [
    ...(status === "published" && can("withdrawn") ? [withdrawItem] : []),
    ...(status === "embargo" && can("embargo")
      ? [changePublicationDateItem]
      : []),
    ...(can("tombstone") ? [tombstoneItem] : []),
  ];
}
