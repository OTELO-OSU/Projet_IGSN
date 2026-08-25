import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { useFieldContext } from "@projet-igsn/design-system/components/form/form-hook-contexts";

import { m } from "#/paraglide/messages.js";
import { UserPicker } from "#/users/user-picker.tsx";

export function UserField({
  id,
  sampleId,
  status,
  excludeMembersOf,
}: {
  id: string;
  sampleId?: string;
  status?: UserStatus;
  excludeMembersOf?: string;
}) {
  const field = useFieldContext<UserIdentity | null>();

  return (
    <UserPicker
      id={id}
      value={field.state.value}
      onChange={field.handleChange}
      placeholder={m.share_email_placeholder()}
      sampleId={sampleId}
      status={status}
      excludeMembersOf={excludeMembersOf}
    />
  );
}
