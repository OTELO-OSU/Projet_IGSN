import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";
import type { ComponentProps } from "react";

import {
  FieldError,
  useFieldError,
} from "@projet-igsn/design-system/components/form/field-error";
import { useFieldContext } from "@projet-igsn/design-system/components/form/form-hook-contexts";

import { m } from "#/paraglide/messages.js";
import { UserPicker } from "#/users/user-picker.tsx";

export function UserField({
  id,
  ...pickerProps
}: Omit<
  ComponentProps<typeof UserPicker>,
  "value" | "onChange" | "placeholder"
>) {
  const field = useFieldContext<UserIdentity | null>();
  const { error, errorId, ariaProps } = useFieldError();

  return (
    <>
      <UserPicker
        id={id}
        value={field.state.value}
        onChange={field.handleChange}
        placeholder={m.share_email_placeholder()}
        {...pickerProps}
        {...ariaProps}
      />
      <FieldError error={error} errorId={errorId} />
    </>
  );
}
