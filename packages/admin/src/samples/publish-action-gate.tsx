import type { ReactNode } from "react";

import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";

// Wraps the WHOLE publish action, not just its button: hiding only the button
// would leave the blockers tooltip behind as an empty focusable span. A null
// role (create page, or still loading) publishes normally.
export function PublishActionGate({
  sampleId,
  children,
}: {
  sampleId?: string;
  children: ReactNode;
}) {
  return useUserRoleOnSample(sampleId) === "contributor" ? null : children;
}
