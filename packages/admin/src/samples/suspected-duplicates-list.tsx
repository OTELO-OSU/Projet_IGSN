import type { SuspectedDuplicate } from "@projet-igsn/domain/sample/publication/suspected-duplicate";

import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";

import { frontendSampleUrl } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";

export function SuspectedDuplicatesList({
  duplicates,
  note,
}: {
  duplicates: SuspectedDuplicate[];
  note?: string;
}) {
  return (
    <div className="grid gap-2 text-sm">
      {note ? <p>{note}</p> : null}
      <p className="font-medium">{m.duplicate_samples_list_heading()}</p>
      <ul className="list-disc ps-4">
        {duplicates.map((duplicate) => (
          <li key={duplicate.id}>
            <ExternalLink href={frontendSampleUrl(duplicate.igsn)}>
              {duplicate.name} ({duplicate.igsn})
            </ExternalLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
