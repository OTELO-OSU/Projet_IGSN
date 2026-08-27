import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type { SetSampleStatusBody } from "@projet-igsn/domain/sample/sample-validator";

import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";

import { m } from "#/paraglide/messages.js";
import { useSetSampleStatus } from "#/samples/use-set-sample-status.ts";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";

type StatusAction = {
  label: () => string;
  title: () => string;
  description: () => string;
  next: SetSampleStatusBody["status"];
};

const STATUS_ACTION: Record<SetSampleStatusBody["status"], StatusAction> = {
  published: {
    label: m.action_withdraw_sample,
    title: m.withdraw_sample_title,
    description: m.withdraw_sample_warning,
    next: "withdrawn",
  },
  withdrawn: {
    label: m.action_republish_sample,
    title: m.republish_sample_title,
    description: m.republish_sample_warning,
    next: "published",
  },
};

export function SampleStatusButton({
  sampleId,
  status,
}: {
  sampleId: string;
  status: SampleStatus;
}) {
  const role = useUserRoleOnSample(sampleId);
  const setStatus = useSetSampleStatus(sampleId);
  if (status === "draft" || !isSampleEditor(role)) {
    return null;
  }
  const action = STATUS_ACTION[status];
  return (
    <ConfirmButton
      variant="outline"
      title={action.title()}
      description={action.description()}
      confirmLabel={m.action_confirm()}
      cancelLabel={m.action_cancel()}
      closeLabel={m.action_close()}
      disabled={setStatus.isPending}
      onConfirm={() => setStatus.mutate(action.next)}
    >
      {action.label()}
    </ConfirmButton>
  );
}
