import { Button } from "@projet-igsn/design-system/components/ui/button";

import { ADMIN_URL } from "#/admin-url.ts";
import { useGetSampleAccess } from "#/domain/samples/hook/get-sample-access.ts";
import { m } from "#/paraglide/messages.js";

export function EditSampleLink({ sampleId }: { sampleId: string }) {
  const hasAccess = useGetSampleAccess(sampleId);
  if (!hasAccess) {
    return null;
  }

  return (
    <Button asChild variant="outline" size="sm">
      <a href={`${ADMIN_URL}/samples/${sampleId}`}>{m.sample_edit()}</a>
    </Button>
  );
}
