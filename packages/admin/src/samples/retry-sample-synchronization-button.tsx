import { Button } from "@projet-igsn/design-system/components/ui/button";

import { m } from "#/paraglide/messages.js";
import { useRetrySampleSynchronization } from "#/samples/use-retry-sample-synchronization.ts";

export function RetrySampleSynchronizationButton({
  sampleId,
}: {
  sampleId: string;
}) {
  const { mutate, isPending } = useRetrySampleSynchronization(sampleId);
  return (
    <Button
      variant="outline"
      className="shrink-0"
      disabled={isPending}
      onClick={() => mutate()}
    >
      {m.action_retry_synchronization()}
    </Button>
  );
}
