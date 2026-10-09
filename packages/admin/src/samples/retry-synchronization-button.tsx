import { Button } from "@projet-igsn/design-system/components/ui/button";

import { m } from "#/paraglide/messages.js";
import { useRetrySynchronization } from "#/samples/use-retry-synchronization.ts";
import { useSamples } from "#/samples/use-samples.ts";

export function RetrySynchronizationButton() {
  const { data } = useSamples({
    page: 1,
    perPage: 10,
    synchronizationStatus: "failed",
  });
  const { mutate, isPending } = useRetrySynchronization();
  if (!data?.total) return null;
  return (
    <Button variant="outline" disabled={isPending} onClick={() => mutate()}>
      {m.action_retry_synchronization()}
    </Button>
  );
}
