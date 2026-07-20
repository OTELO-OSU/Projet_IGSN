import type { SampleAttachment } from "@projet-igsn/domain/sample/attachment/model";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

// A plain anchor cannot carry the bearer token, so the download fetches the
// blob through the authed client and hands it to the browser as an object URL.
export function useDownloadAttachment(sampleId: string) {
  const apiFetch = useApiClient();
  return async (attachment: SampleAttachment): Promise<void> => {
    try {
      const res = await apiFetch(
        new URL(
          `admin/samples/${sampleId}/attachments/${attachment.id}`,
          API_URL,
        ),
      );
      if (!res.ok) {
        throw new Error(`Failed to download attachment (${res.status})`);
      }
      const url = URL.createObjectURL(await res.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(m.attachment_download_error());
    }
  };
}
