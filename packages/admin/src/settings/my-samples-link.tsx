import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { CopyIcon, ExternalLinkIcon } from "lucide-react";

import { FRONTEND_URL } from "#/frontend-url.ts";
import { m } from "#/paraglide/messages.js";

export function MySamplesLink({ userId }: { userId: string }) {
  const link = `${FRONTEND_URL}/search?contributor=${userId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success(m.settings_my_samples_copied());
    } catch {
      toast.error(m.settings_my_samples_copy_error());
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="my-samples-link" className="shrink-0">
        {m.settings_my_samples_link()}
      </Label>
      <Input
        id="my-samples-link"
        readOnly
        value={link}
        className="flex-1"
        onClick={(event) => {
          event.currentTarget.select();
          void copyLink();
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={m.action_copy_link()}
        onClick={() => void copyLink()}
      >
        <CopyIcon />
      </Button>
      <Button asChild variant="outline" size="icon">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={m.action_open_new_window()}
        >
          <ExternalLinkIcon />
        </a>
      </Button>
    </div>
  );
}
