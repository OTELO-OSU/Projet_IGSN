import { ComboboxTrigger } from "@projet-igsn/design-system/components/ui/combobox";
import {
  Popover,
  PopoverContent,
} from "@projet-igsn/design-system/components/ui/popover";
import { SearchInput } from "@projet-igsn/design-system/components/ui/search-input";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import type { TreeFilterNode } from "#/filters/tree-filter-node.ts";

import { filterNodes } from "#/filters/tree-filter-node.ts";
import { m } from "#/paraglide/messages.js";

type RowsState = {
  selected: string | undefined;
  expandedKeys: Set<string>;
  isSearching: boolean;
  toggle: (key: string) => void;
  select: (value: string | undefined) => void;
};

function TreeRows({
  nodes,
  rows,
}: {
  nodes: TreeFilterNode[];
  rows: RowsState;
}) {
  return (
    <ul>
      {nodes.map((node) => (
        <TreeRow key={node.key} node={node} rows={rows} />
      ))}
    </ul>
  );
}

function TreeRow({ node, rows }: { node: TreeFilterNode; rows: RowsState }) {
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
                ? m.filter_tree_collapse({ name: node.label })
                : m.filter_tree_expand({ name: node.label })
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
          <TreeRows nodes={node.children} rows={rows} />
        </div>
      ) : null}
    </li>
  );
}

export function TreeFilter({
  id,
  nodes,
  value,
  onChange,
  selectedLabel,
  anyLabel,
  searchLabel,
  emptyText,
}: {
  id?: string;
  nodes: TreeFilterNode[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  selectedLabel: string | undefined;
  anyLabel: string;
  searchLabel: string;
  emptyText: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [expandedKeys, setExpandedKeys] = useState(new Set<string>());

  const toggle = (key: string) =>
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const visible = filterNodes(nodes, search);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <ComboboxTrigger id={id} open={isOpen}>
        {selectedLabel ?? anyLabel}
      </ComboboxTrigger>
      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-2">
        <SearchInput
          label={searchLabel}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={m.filter_tree_search_placeholder()}
        />
        <div className="mt-2 max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setIsOpen(false);
            }}
            className="hover:bg-accent w-full rounded px-1 py-1 text-left text-sm"
          >
            {anyLabel}
          </button>
          {visible.length === 0 ? (
            <p className="text-muted-foreground px-1 py-2 text-sm">
              {emptyText}
            </p>
          ) : (
            <TreeRows
              nodes={visible}
              rows={{
                selected: value,
                expandedKeys,
                isSearching: search !== "",
                toggle,
                select: (next) => {
                  onChange(next);
                  setIsOpen(false);
                },
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
