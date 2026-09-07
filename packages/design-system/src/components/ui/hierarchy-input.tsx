import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { Fragment, useState } from "react";

import {
  canStopAtPath,
  hierarchyLevelItems,
  hierarchyPathLabel,
  type Hierarchy,
} from "../../lib/hierarchy.ts";
import { cn } from "../../lib/utils.ts";
import { Badge } from "./badge.tsx";
import { Button } from "./button.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command.tsx";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "./popover.tsx";

type HierarchyInputProps = {
  id?: string;
  hierarchy: Hierarchy;
  translate: (code: string) => string;
  value: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  isSelectable?: (path: string) => boolean;
  isLevelLocked?: (depth: number) => boolean;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  stopLabel: string;
  removeLabel: (label: string) => string;
  hint?: { id: string; mustRefineText: string; canRefineText: string };
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function HierarchyInput({
  id,
  hierarchy,
  translate,
  value: path,
  onChange,
  onBlur,
  isSelectable = () => true,
  isLevelLocked,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyText,
  stopLabel,
  removeLabel,
  hint,
  ...aria
}: HierarchyInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingDepth, setEditingDepth] = useState<number | null>(null);

  const isLocked = (level: number) =>
    disabled === true || isLevelLocked?.(level) === true;

  const childrenOf = (parent: string | null) =>
    hierarchyLevelItems(hierarchy, parent, translate).filter((item) =>
      isSelectable(item.value),
    );

  const current = path.at(-1) ?? null;
  const isLeaf = childrenOf(current).length === 0;
  const canStop = current !== null && canStopAtPath(hierarchy, current);

  const depth = editingDepth ?? path.length;
  const query = search.trim().toLowerCase();
  const children = childrenOf(path[depth - 1] ?? null).filter((item) =>
    item.label.toLowerCase().includes(query),
  );

  const close = () => {
    setOpen(false);
    setSearch("");
    setEditingDepth(null);
  };

  const pick = (child: string) => {
    if (child !== path[depth]) onChange([...path.slice(0, depth), child]);
    if (childrenOf(child).length === 0) return close();
    setSearch("");
    setEditingDepth(depth + 1);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1",
            disabled && "opacity-50",
          )}
        >
          {path.map((nodePath, level) => {
            const nodeLabel = hierarchyPathLabel(
              hierarchy,
              nodePath,
              translate,
            );
            const locked = isLocked(level);
            return (
              <Fragment key={nodePath}>
                {level > 0 ? (
                  <span aria-hidden className="text-muted-foreground text-xs">
                    {">"}
                  </span>
                ) : null}
                <Badge
                  variant="secondary"
                  className={cn(
                    !locked && "gap-1 pr-1",
                    level === depth && "ring-2 ring-ring",
                    level > depth && "opacity-50",
                  )}
                >
                  {locked ? (
                    nodeLabel
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDepth(level);
                          setOpen(true);
                        }}
                        className="hover:underline"
                      >
                        {nodeLabel}
                      </button>
                      <button
                        type="button"
                        aria-label={removeLabel(nodeLabel)}
                        onClick={() => onChange(path.slice(0, level))}
                        className="hover:bg-foreground/10 rounded-full"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </>
                  )}
                </Badge>
              </Fragment>
            );
          })}
          {hint && current !== null && !isLeaf ? (
            <span id={hint.id} className="text-muted-foreground text-xs">
              <span aria-hidden>{canStop ? "(> ...)" : "> ..."}</span>
              <span className="sr-only">
                {canStop ? hint.canRefineText : hint.mustRefineText}
              </span>
            </span>
          ) : null}
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              disabled={isLocked(path.length) || isLeaf}
              onBlur={onBlur}
              className="text-muted-foreground h-7 flex-1 justify-between px-1 font-normal hover:bg-transparent"
              {...aria}
            >
              {path.length === 0 ? placeholder : null}
              <ChevronsUpDownIcon className="opacity-50" />
            </Button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {depth === path.length && path.length > 0 && !query ? (
                <CommandItem value="-" onSelect={close}>
                  {stopLabel}
                </CommandItem>
              ) : null}
              {children.map(({ value, label }) => (
                <CommandItem
                  key={value}
                  value={value}
                  aria-checked={value === path[depth]}
                  onSelect={() => pick(value)}
                >
                  <CheckIcon
                    className={cn(
                      value === path[depth] ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
