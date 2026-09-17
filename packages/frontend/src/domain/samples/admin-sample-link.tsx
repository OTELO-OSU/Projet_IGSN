import { Button } from "@projet-igsn/design-system/components/ui/button";

import { ADMIN_URL } from "#/admin-url.ts";
import { useGetSampleAccess } from "#/domain/samples/hook/get-sample-access.ts";

export function AdminSampleLink({
  sampleId,
  path,
  label,
}: {
  sampleId: string;
  path: string;
  label: string;
}) {
  const hasAccess = useGetSampleAccess(sampleId);
  if (!hasAccess) {
    return null;
  }

  return (
    <Button asChild variant="secondary">
      <a href={`${ADMIN_URL}${path}`}>{label}</a>
    </Button>
  );
}
