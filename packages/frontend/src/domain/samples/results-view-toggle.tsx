import type { LucideIcon } from "lucide-react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@projet-igsn/design-system/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { LayoutGridIcon, TableIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

const TABLE = "table";

function ViewItem({
  value,
  label,
  Icon,
}: {
  value: string;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem
          value={value}
          aria-label={label}
          className="text-primary hover:text-primary aria-checked:bg-primary aria-checked:text-primary-foreground aria-checked:hover:bg-primary/90 aria-checked:hover:text-primary-foreground"
        >
          <Icon aria-hidden="true" />
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ResultsViewToggle({
  isTableView,
  onTableViewChange,
}: {
  isTableView: boolean;
  onTableViewChange: (isTableView: boolean) => void;
}) {
  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label={m.results_view()}
        value={isTableView ? TABLE : "cards"}
        onValueChange={(value) => {
          if (value) onTableViewChange(value === TABLE);
        }}
        className="phone:hidden"
      >
        <ViewItem
          value="cards"
          label={m.results_card_view()}
          Icon={LayoutGridIcon}
        />
        <ViewItem
          value={TABLE}
          label={m.results_table_view()}
          Icon={TableIcon}
        />
      </ToggleGroup>
    </TooltipProvider>
  );
}
