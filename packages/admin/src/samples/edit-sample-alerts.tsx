import type { Sample } from "@projet-igsn/domain/sample/sample";

import {
  Alert,
  AlertDescription,
} from "@projet-igsn/design-system/components/ui/alert";
import { InfoIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { RetrySampleSynchronizationButton } from "#/samples/retry-sample-synchronization-button.tsx";

export function EditSampleAlerts({
  sample,
  sampleId,
  canRetrySynchronization,
  lockedMessage,
  rejection,
}: {
  sample: Pick<
    Sample,
    "status" | "synchronizationStatus" | "synchronizationError"
  >;
  sampleId: string;
  canRetrySynchronization: boolean;
  lockedMessage: string | undefined;
  rejection: string | undefined;
}) {
  return (
    <>
      {lockedMessage ? (
        <div role="status">
          <Alert role="none" variant="info">
            <InfoIcon />
            <AlertDescription>{lockedMessage}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      {sample.synchronizationStatus === "failed" &&
      sample.synchronizationError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {(sample.status === "draft"
              ? m.sample_publication_failed_alert
              : m.sample_synchronization_failed_alert)({
              error: sample.synchronizationError,
            })}
          </AlertDescription>
          {canRetrySynchronization ? (
            <RetrySampleSynchronizationButton sampleId={sampleId} />
          ) : null}
        </Alert>
      ) : null}

      {rejection ? (
        <Alert variant="destructive">
          <AlertDescription>{rejection}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}
