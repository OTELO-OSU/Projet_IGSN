import { Button } from "@projet-igsn/design-system/components/ui/button";
import { DownloadIcon } from "lucide-react";

import { baseBrowserApiUrl } from "#/api.ts";
import { m } from "#/paraglide/messages.js";

export function DownloadSampleLink({ igsn }: { igsn: string }) {
  return (
    <Button asChild variant="secondary">
      <a
        href={new URL(`samples/${igsn}/export`, baseBrowserApiUrl).href}
        download
      >
        <DownloadIcon aria-hidden="true" />
        {m.download_sample()}
      </a>
    </Button>
  );
}
