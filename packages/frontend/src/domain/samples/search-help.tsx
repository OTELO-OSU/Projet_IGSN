import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@projet-igsn/design-system/components/ui/popover";
import { CircleQuestionMarkIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

// A popover, not a tooltip: a tooltip never opens on tap, which would leave the
// rules unreachable on touch.
export function SearchHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-full"
          aria-label={m.search_help_label()}
        >
          <CircleQuestionMarkIcon aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      {/* Unnamed, the Radix dialog announces as just "dialog". */}
      <PopoverContent
        aria-label={m.search_help_label()}
        className="w-72 p-3 text-sm"
      >
        <ul className="list-disc ps-4">
          <li>{m.search_help_tokens()}</li>
          <li>{m.search_help_wildcard()}</li>
          <li>{m.search_help_fuzzy()}</li>
          <li>{m.search_help_igsn()}</li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
