import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type {
  SampleStatus,
  SynchronizationStatus,
} from "@projet-igsn/domain/sample/sample";
import type { PublishStatus } from "@projet-igsn/domain/sample/sample-validator";

import { Button } from "@projet-igsn/design-system/components/ui/button";

import { m } from "#/paraglide/messages.js";
import {
  ConfirmMenuButton,
  type ConfirmMenuAction,
} from "#/samples/confirm-menu-button.tsx";
import {
  SamplePublishGate,
  type SamplePublishGateProps,
} from "#/samples/sample-publish-gate.tsx";
import { SampleSubmitButton } from "#/samples/sample-submit-button.tsx";

type SampleSubmitMenu = {
  label: string;
  items: SampleSubmitMenuItem[];
};

export type SampleSubmitMenuItem = Omit<ConfirmMenuAction, "onConfirm"> & {
  onConfirm: (value: CreateSample) => void | Promise<unknown>;
};

export type SamplePublish = (
  value: CreateSample,
  status: PublishStatus,
  publishedAt?: string,
) => void | Promise<unknown>;

export type SampleFormAction =
  | {
      kind: "submit";
      label: string;
      onSubmit: (value: CreateSample) => void | Promise<unknown>;
      menu?: SampleSubmitMenu;
    }
  | {
      kind: "publish";
      label: string;
      disabled?: boolean;
      onPublish: SamplePublish;
    }
  | { kind: "link"; label: string; href: string };

export type SampleFormActionContext = {
  gate: SamplePublishGateProps;
  canPublish: boolean;
  wasPublished: boolean;
  isCheckingDuplicates: boolean;
  askPublish: (status: PublishStatus, onPublish: SamplePublish) => unknown;
  submitWith: (
    onValid: (value: CreateSample) => void | Promise<unknown>,
  ) => void;
  sampleId: string | undefined;
  status: SampleStatus;
  synchronizationStatus: SynchronizationStatus | null;
  readOnlyReason: string | undefined;
};

export function SampleFormActionButton({
  action,
  variant,
  context: {
    gate,
    canPublish,
    wasPublished,
    isCheckingDuplicates,
    askPublish,
    submitWith,
    sampleId,
    status,
    synchronizationStatus,
    readOnlyReason,
  },
}: {
  action: SampleFormAction;
  variant?: "outline";
  context: SampleFormActionContext;
}) {
  if (action.kind === "link") {
    return (
      <Button asChild variant={variant}>
        <a href={action.href} target="_blank" rel="noopener noreferrer">
          {action.label}
        </a>
      </Button>
    );
  }
  if (action.kind === "publish") {
    if (!canPublish) {
      return null;
    }
    return (
      <SamplePublishGate {...gate}>
        {(gated) => {
          const disabled =
            gated || action.disabled === true || isCheckingDuplicates;
          return (
            <div className="flex">
              <Button
                type="button"
                className="rounded-r-none"
                disabled={disabled}
                onClick={() => void askPublish("published", action.onPublish)}
              >
                {action.label}
              </Button>
              <ConfirmMenuButton
                label={m.action_publish_options()}
                className="border-l-primary-foreground/30 rounded-l-none border-l"
                disabled={disabled}
                items={[
                  {
                    label: m.action_withdraw(),
                    onSelect: () =>
                      void askPublish("withdrawn", action.onPublish),
                  },
                  {
                    label: m.action_publish_with_embargo(),
                    onSelect: () =>
                      void askPublish("embargo", action.onPublish),
                  },
                ]}
              />
            </div>
          );
        }}
      </SamplePublishGate>
    );
  }
  // ponytail: only one submit-kind action is supported at a time.
  // add explicit per-button meta if that ever changes.
  const menu = action.menu;
  const submitButton = (disabled: boolean) => (
    <div className="flex">
      <SampleSubmitButton
        label={action.label}
        variant={variant}
        className={menu ? "rounded-r-none" : undefined}
        disabled={disabled}
        sampleId={sampleId}
        status={status}
        synchronizationStatus={synchronizationStatus}
        blockedReason={readOnlyReason}
      />
      {menu ? (
        <ConfirmMenuButton
          label={menu.label}
          variant={variant}
          className="-ml-px rounded-l-none"
          disabled={disabled}
          items={menu.items.map((item) => ({
            ...item,
            onConfirm: () => submitWith(item.onConfirm),
          }))}
        />
      ) : null}
    </div>
  );
  return wasPublished ? (
    <SamplePublishGate {...gate}>{submitButton}</SamplePublishGate>
  ) : (
    submitButton(gate.isDisabled)
  );
}
