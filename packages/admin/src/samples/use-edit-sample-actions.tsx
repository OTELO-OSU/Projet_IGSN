import type { Sample } from "@projet-igsn/domain/sample/sample";
import type {
  AdminSampleResponse,
  SetSampleStatusBody,
} from "@projet-igsn/domain/sample/sample-validator";

import { canSetSampleStatus } from "@projet-igsn/domain/user-sample/can-set-sample-status";

import type { SampleFormProps } from "#/samples/sample-form.tsx";
import type { usePublishSample } from "#/samples/use-publish-sample.ts";
import type { useSetSampleStatus } from "#/samples/use-set-sample-status.ts";
import type { useUpdateSample } from "#/samples/use-update-sample.ts";

import { frontendSampleUrl } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";
import { SampleRestoreButton } from "#/samples/sample-restore-button.tsx";
import { useSampleStatusMenu } from "#/samples/use-sample-status-menu.tsx";

export function useEditSampleActions({
  sample,
  sampleId,
  isPending,
  publicHint,
  lockedMessage,
  rejection,
  updateSample,
  publishSample,
  setStatus,
  onLeave,
}: {
  sample: Pick<Sample, "status" | "igsn"> &
    Pick<AdminSampleResponse, "role" | "managed">;
  sampleId: string;
  isPending: boolean;
  publicHint: string | undefined;
  lockedMessage: string | undefined;
  rejection: string | undefined;
  updateSample: ReturnType<typeof useUpdateSample>;
  publishSample: ReturnType<typeof usePublishSample>;
  setStatus: ReturnType<typeof useSetSampleStatus>;
  onLeave: () => void;
}): Pick<
  SampleFormProps,
  "readOnlyReason" | "statusAction" | "secondaryAction" | "primaryAction"
> {
  const { role, managed, status } = sample;
  const isTombstone = status === "tombstone";
  const can = (to: SetSampleStatusBody["status"]) =>
    canSetSampleStatus(role, managed, { status }, to);
  const statusItems = useSampleStatusMenu({
    status,
    can,
    updateSample,
    setStatus,
    onLeave,
  });
  const restoreButton = (
    text: "published" | "publish_now",
    menu?: "withdrawn",
  ) => (
    <SampleRestoreButton
      text={text}
      menu={menu}
      onSetStatus={(next) => setStatus.mutate({ status: next })}
      disabled={isPending}
    />
  );
  return isTombstone
    ? {
        readOnlyReason: publicHint,
        statusAction: restoreButton("published", "withdrawn"),
      }
    : {
        readOnlyReason: lockedMessage ?? rejection,
        statusAction: !can("published")
          ? undefined
          : status === "withdrawn"
            ? restoreButton("published")
            : status === "embargo"
              ? restoreButton("publish_now")
              : undefined,
        secondaryAction: {
          kind: "submit",
          label: m.action_save(),
          onSubmit: (value) => updateSample.mutateAsync(value),
          menu: statusItems.length
            ? { label: m.action_status_options(), items: statusItems }
            : undefined,
        },
        primaryAction: sample.igsn
          ? {
              kind: "link",
              label: m.action_view_public_page(),
              href: frontendSampleUrl(sample.igsn),
            }
          : {
              kind: "publish",
              label: m.action_publish(),
              onPublish: (value, publishStatus, publishedAt) =>
                updateSample.mutateAsync(value).then(() =>
                  publishSample.mutate(
                    { id: sampleId, status: publishStatus, publishedAt },
                    {
                      onSuccess: onLeave,
                    },
                  ),
                ),
            },
      };
}
