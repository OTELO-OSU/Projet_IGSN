import type { Button } from "@projet-igsn/design-system/components/ui/button";
import type { SampleStatus } from "@projet-igsn/domain/sample/sample";
import type { ComponentProps } from "react";

import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { canUpdateSample } from "@projet-igsn/domain/user-sample/can-update-sample";

import { m } from "#/paraglide/messages.js";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";

type SampleSubmitButtonProps = {
  label: string;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
  sampleId?: string;
  status: SampleStatus;
  blockedReason?: string;
};

export function SampleSubmitButton({
  label,
  disabled,
  variant,
  className,
  sampleId,
  status,
  blockedReason,
}: SampleSubmitButtonProps) {
  const form = useTypedAppFormContext({ defaultValues: {} });
  const roleOnSample = useUserRoleOnSample(sampleId);
  const reason =
    blockedReason ??
    (roleOnSample !== null && !canUpdateSample(roleOnSample, { status })
      ? m.save_blocked_not_editor()
      : undefined);
  const button = (
    <form.SubmitButton
      label={label}
      variant={variant}
      className={className}
      disabled={disabled || reason !== undefined}
    />
  );
  if (reason === undefined) {
    return button;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{reason}</p>
      </TooltipContent>
    </Tooltip>
  );
}
