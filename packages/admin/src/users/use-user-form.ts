import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";

import type { UserDraft } from "#/users/compose-user.ts";

export function useUserForm() {
  return useTypedAppFormContext({ defaultValues: {} as UserDraft });
}
