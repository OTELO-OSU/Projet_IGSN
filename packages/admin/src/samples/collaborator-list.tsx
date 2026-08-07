import { Button } from "@projet-igsn/design-system/components/ui/button";
import { X } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { fullName } from "#/samples/full-name.ts";
import { useCollaborators } from "#/samples/use-collaborators.ts";
import { useRemoveContributor } from "#/samples/use-remove-contributor.ts";

export function CollaboratorList({ sampleId }: { sampleId: string }) {
  const collaborators = useCollaborators(sampleId);
  const removeContributor = useRemoveContributor(sampleId);
  const owner = collaborators.data?.find((user) => user.role === "owner");
  const contributors =
    collaborators.data?.filter((user) => user.role === "contributor") ?? [];

  return (
    <>
      {owner ? (
        <section className="grid gap-1">
          <h3 className="text-sm font-medium">{m.share_owner_label()}</h3>
          <p className="text-sm">
            {fullName(owner)}{" "}
            <span className="text-muted-foreground">{owner.email}</span>
          </p>
        </section>
      ) : null}
      <section className="grid gap-1">
        <h3 className="text-sm font-medium">{m.share_collaborators_label()}</h3>
        {collaborators.isPending ? (
          <p className="text-muted-foreground text-sm">
            {m.share_contributors_loading()}
          </p>
        ) : collaborators.isError ? (
          <p role="alert" className="text-sm">
            {m.share_contributors_error()}
          </p>
        ) : contributors.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {m.share_contributors_empty()}
          </p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {contributors.map((user) => (
              <li key={user.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {fullName(user)}{" "}
                  <span className="text-muted-foreground">{user.email}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={m.share_contributor_remove({
                    name: fullName(user),
                  })}
                  onClick={() => removeContributor.mutate(user.id)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
