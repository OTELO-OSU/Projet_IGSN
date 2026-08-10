import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import { X } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { collaboratorRoleLabel } from "#/samples/collaborator-role-label.ts";
import { fullName } from "#/samples/full-name.ts";
import { useCollaborators } from "#/samples/use-collaborators.ts";
import { useRemoveCollaborator } from "#/samples/use-remove-collaborator.ts";

export function CollaboratorList({
  sampleId,
  mayRemove,
}: {
  sampleId: string;
  mayRemove: boolean;
}) {
  const collaborators = useCollaborators(sampleId);
  const removeCollaborator = useRemoveCollaborator(sampleId);
  const users = collaborators.data ?? [];

  if (collaborators.isPending) {
    return (
      <p className="text-muted-foreground text-sm">
        {m.share_contributors_loading()}
      </p>
    );
  }
  if (collaborators.isError) {
    return (
      <p role="alert" className="text-sm">
        {m.share_contributors_error()}
      </p>
    );
  }
  if (users.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {m.share_contributors_empty()}
      </p>
    );
  }

  return (
    <ul
      aria-label={m.share_collaborators_label()}
      className="divide-border grid divide-y rounded-lg border"
    >
      {users.map((user) => (
        <li key={user.id} className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {fullName(user)}
            </span>
            <span className="text-muted-foreground block truncate text-sm">
              {user.email}
            </span>
          </span>
          <Badge variant="secondary">{collaboratorRoleLabel(user.role)}</Badge>
          {mayRemove &&
            (user.role === "owner" ? (
              <span aria-hidden className="size-9 shrink-0" />
            ) : (
              <ConfirmButton
                variant="ghost"
                size="icon"
                aria-label={m.share_contributor_remove({
                  name: fullName(user),
                })}
                title={m.share_contributor_remove_title()}
                description={m.share_contributor_remove_description({
                  name: fullName(user),
                })}
                confirmLabel={m.action_confirm()}
                cancelLabel={m.action_cancel()}
                closeLabel={m.action_close()}
                onConfirm={() => removeCollaborator.mutate(user.id)}
              >
                <X aria-hidden />
              </ConfirmButton>
            ))}
        </li>
      ))}
    </ul>
  );
}
