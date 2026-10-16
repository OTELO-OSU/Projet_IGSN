import type { PublishBlocker } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import type { User } from "@projet-igsn/domain/user/model";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { samplePublishBlockers } from "@projet-igsn/domain/sample/publication/sample-publish-blockers";

import type { AttachmentMetadata } from "#/samples/attachment-metadata.ts";

import { m } from "#/paraglide/messages.js";
import { publishBlockerLines } from "#/samples/publish-blocker-field-label.ts";
import { samplePublishInput } from "#/samples/sample-publish-input.ts";
import { saveRequiredFields } from "#/samples/sample-required-fields.ts";
import { useSampleForm } from "#/samples/use-sample-form.ts";
import { UPLOAD_LIMIT } from "#/upload-limit.ts";

export type SamplePublishGateProps = {
  keptAttachments: AttachmentMetadata[];
  existingBlockers: readonly PublishBlocker[];
  currentUser: Pick<User, "status" | "superAdmin"> | undefined;
  isDisabled: boolean;
};

export function SamplePublishGate({
  keptAttachments,
  existingBlockers,
  currentUser,
  isDisabled,
  children,
}: SamplePublishGateProps & {
  children: (disabled: boolean) => ReactNode;
}) {
  const form = useSampleForm();
  return (
    <form.Subscribe
      selector={(state) => ({
        canSubmit: state.canSubmit,
        values: state.values,
      })}
    >
      {({ canSubmit, values }) => {
        const publishInput = samplePublishInput(values, keptAttachments);
        const reasons = publishBlockerLines(
          samplePublishBlockers(publishInput, UPLOAD_LIMIT, currentUser).filter(
            (blocker) => !existingBlockers.includes(blocker),
          ),
          saveRequiredFields(values).filter(({ isMet }) => !isMet),
          publishInput,
        );
        const button = children(isDisabled || !canSubmit || reasons.length > 0);
        return reasons.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{m.publish_blocked_title()}</p>
              <ul className="list-disc ps-4">
                {reasons.map(({ key, line }) => (
                  <li key={key}>{line}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        ) : (
          button
        );
      }}
    </form.Subscribe>
  );
}
