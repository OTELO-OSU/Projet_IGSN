import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import { isSampleEditor } from "@projet-igsn/domain/user-sample/is-sample-editor";

import { m } from "#/paraglide/messages.js";
import { useSetSampleStatus } from "#/samples/use-set-sample-status.ts";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";

export function RepublishButton({ sampleId }: { sampleId: string }) {
  const role = useUserRoleOnSample(sampleId);
  const setStatus = useSetSampleStatus(sampleId);
  if (!isSampleEditor(role)) {
    return null;
  }
  return (
    <ConfirmButton
      variant="outline"
      title={m.republish_sample_title()}
      description={m.republish_sample_warning()}
      confirmLabel={m.action_confirm()}
      cancelLabel={m.action_cancel()}
      closeLabel={m.action_close()}
      disabled={setStatus.isPending}
      onConfirm={() => setStatus.mutate("published")}
    >
      {m.action_republish_sample()}
    </ConfirmButton>
  );
}
