import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";

import { frontendSampleUrl } from "#/frontend-url.ts";

export function ParentSampleLink({
  parent,
}: {
  parent: Pick<SampleParent, "igsn" | "name">;
}) {
  return (
    <a
      className="text-foreground underline underline-offset-2"
      href={frontendSampleUrl(parent.igsn)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {parent.name}
    </a>
  );
}
