import { Button } from "@projet-igsn/design-system/components/ui/button";

import { m } from "#/paraglide/messages.js";
import { useRetryPublication } from "#/samples/use-retry-publication.ts";
import { useSamples } from "#/samples/use-samples.ts";

export function RetryPublicationButton() {
  const { data } = useSamples({
    page: 1,
    perPage: 10,
    status: "publish_failed",
  });
  const { mutate, isPending } = useRetryPublication();
  if (!data?.total) return null;
  return (
    <Button variant="outline" disabled={isPending} onClick={() => mutate()}>
      {m.action_retry_publication()}
    </Button>
  );
}
