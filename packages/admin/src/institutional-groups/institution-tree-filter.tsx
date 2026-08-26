import { ComboboxTrigger } from "@projet-igsn/design-system/components/ui/combobox";
import {
  Popover,
  PopoverContent,
} from "@projet-igsn/design-system/components/ui/popover";
import { SearchInput } from "@projet-igsn/design-system/components/ui/search-input";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { ChevronRightIcon } from "lucide-react";

import type { InstitutionNode } from "#/institutional-groups/institution-tree-nodes.ts";
import type { InstitutionRowsState } from "#/institutional-groups/use-institution-tree-filter.ts";

import { useInstitutionTreeFilter } from "#/institutional-groups/use-institution-tree-filter.ts";
import { m } from "#/paraglide/messages.js";

function InstitutionRows({
  nodes,
  rows,
}: {
  nodes: InstitutionNode[];
  rows: InstitutionRowsState;
}) {
  return (
    <ul>
      {nodes.map((node) => (
        <InstitutionRow key={node.key} node={node} rows={rows} />
      ))}
    </ul>
  );
}

function InstitutionRow({
  node,
  rows,
}: {
  node: InstitutionNode;
  rows: InstitutionRowsState;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = rows.isSearching || rows.expandedKeys.has(node.key);
  const isSelected = node.value === rows.selected;

  return (
    <li>
      <div className="flex items-start gap-1">
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? m.filter_institution_collapse({ name: node.label })
                : m.filter_institution_expand({ name: node.label })
            }
            onClick={() => rows.toggle(node.key)}
            className="hover:bg-accent mt-1 rounded p-0.5"
          >
            <ChevronRightIcon
              className={cn("size-4", isExpanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        {node.value === undefined ? (
          <span className="px-1 py-1 text-sm italic">{node.label}</span>
        ) : (
          <button
            type="button"
            onClick={() => rows.select(node.value)}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "hover:bg-accent flex-1 rounded px-1 py-1 text-left text-sm",
              isSelected && "bg-accent font-medium",
            )}
          >
            {node.label}
          </button>
        )}
      </div>
      {isExpanded && hasChildren ? (
        <div className="pl-4">
          <InstitutionRows nodes={node.children} rows={rows} />
        </div>
      ) : null}
    </li>
  );
}

export function InstitutionTreeFilter({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const filter = useInstitutionTreeFilter(value, onChange);

  return (
    <Popover open={filter.isOpen} onOpenChange={filter.setIsOpen}>
      <ComboboxTrigger id={id} open={filter.isOpen}>
        {filter.label}
      </ComboboxTrigger>
      <PopoverContent className="w-96 p-2">
        <SearchInput
          label={m.filter_institution_search_label()}
          value={filter.search}
          onChange={(event) => filter.setSearch(event.target.value)}
          placeholder={m.filter_institution_search_placeholder()}
        />
        <div className="mt-2 max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => filter.rows.select(undefined)}
            className="hover:bg-accent w-full rounded px-1 py-1 text-left text-sm"
          >
            {m.filter_institution_any()}
          </button>
          {filter.nodes.length === 0 ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">
              {m.filter_institution_empty()}
            </p>
          ) : (
            <InstitutionRows nodes={filter.nodes} rows={filter.rows} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
