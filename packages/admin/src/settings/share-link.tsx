import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";

export function ShareLink({ label, link }: { label: string; link: string }) {
  const id = useId();
  const copyLink = () =>
    void navigator.clipboard.writeText(link).then(
      () => toast.success(m.settings_link_copied()),
      () => toast.error(m.settings_link_copy_error()),
    );

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="shrink-0">
        {label}
      </Label>
      <Input
        id={id}
        readOnly
        value={link}
        className="flex-1"
        onClick={(event) => {
          event.currentTarget.select();
          copyLink();
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={m.action_copy_link()}
        onClick={copyLink}
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
