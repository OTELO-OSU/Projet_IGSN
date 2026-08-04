import { m } from "#/paraglide/messages.js";
import { fullName } from "#/samples/full-name.ts";
import { useContributors } from "#/samples/use-contributors.ts";

export function CollaboratorList({ sampleId }: { sampleId: string }) {
  const contributors = useContributors(sampleId);

  return (
    <section className="grid gap-1">
      <h3 className="text-sm font-medium">{m.share_collaborators_label()}</h3>
      {contributors.isPending ? (
        <p className="text-muted-foreground text-sm">
          {m.share_contributors_loading()}
        </p>
      ) : contributors.isError ? (
        <p role="alert" className="text-sm">
          {m.share_contributors_error()}
        </p>
      ) : contributors.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {m.share_contributors_empty()}
        </p>
      ) : (
        <ul className="grid gap-1 text-sm">
          {contributors.data.map((user) => (
            <li key={user.id}>
              {fullName(user)}{" "}
              <span className="text-muted-foreground">{user.email}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
