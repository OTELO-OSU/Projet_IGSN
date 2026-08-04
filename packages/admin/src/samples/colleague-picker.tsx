import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@projet-igsn/design-system/components/ui/popover";
import { ChevronsUpDownIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { ColleagueSearch } from "#/samples/colleague-search.tsx";
import { useAddContributor } from "#/samples/use-add-contributor.ts";

export function ColleaguePicker({ sampleId }: { sampleId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const addContributor = useAddContributor(sampleId);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={m.share_search_label()}
          aria-expanded={isOpen}
          className="w-full justify-between font-normal"
        >
          {m.share_search_label()}
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <ColleagueSearch
          onPick={(userId) => {
            addContributor.mutate(userId);
            setIsOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
