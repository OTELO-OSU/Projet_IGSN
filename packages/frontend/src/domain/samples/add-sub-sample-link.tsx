import { Button } from "@projet-igsn/design-system/components/ui/button";
import { useAuth } from "react-oidc-context";

import { ADMIN_URL } from "#/admin-url.ts";
import { m } from "#/paraglide/messages.js";

export function AddSubSampleLink({ sampleId }: { sampleId: string }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button asChild variant="secondary">
      <a href={`${ADMIN_URL}/samples/create?parent=${sampleId}`}>
        {m.sample_add_sub_sample()}
      </a>
    </Button>
  );
}
