import type { Button } from "@projet-igsn/design-system/components/ui/button";
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
  sampleId?: string;
  published: boolean;
};

export function SampleSubmitButton({
  label,
  disabled,
  variant,
  sampleId,
  published,
}: SampleSubmitButtonProps) {
  const form = useTypedAppFormContext({ defaultValues: {} });
  const roleOnSample = useUserRoleOnSample(sampleId);
  const isBlocked =
    roleOnSample !== null && !canUpdateSample(roleOnSample, { published });
  const button = (
    <form.SubmitButton
      label={label}
      variant={variant}
      disabled={disabled || isBlocked}
    />
  );
  if (!isBlocked) {
    return button;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{m.save_blocked_not_owner()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
