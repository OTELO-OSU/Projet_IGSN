import type { ListedUser } from "@projet-igsn/domain/user/user-validator";

import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import { fullName } from "@projet-igsn/domain/user/full-name";

import { m } from "#/paraglide/messages.js";

import { useRemoveUserInstitution } from "./use-remove-user-institution.ts";

export function RemoveUserInstitutionButton({
  user,
}: {
  user: Pick<ListedUser, "id" | "email" | "name" | "firstname">;
}) {
  const remove = useRemoveUserInstitution();
  const name = fullName(user) || user.email;

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <ConfirmButton
        variant="outline"
        size="sm"
        aria-label={m.user_remove_institution_member({ name })}
        title={m.user_remove_institution_title()}
        description={m.user_remove_institution_description({ name })}
        confirmLabel={m.user_remove_institution_action()}
        cancelLabel={m.action_cancel()}
        closeLabel={m.action_close()}
        onConfirm={() => remove.mutate(user.id)}
      >
        {m.user_remove_institution_action()}
      </ConfirmButton>
    </div>
  );
}
