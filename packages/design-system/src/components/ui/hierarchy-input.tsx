import type { ReactNode } from "react";

import { ChevronsUpDownIcon } from "lucide-react";

import { hierarchyPathLabel, type Hierarchy } from "../../lib/hierarchy.ts";
import { cn } from "../../lib/utils.ts";
import { Button } from "./button.tsx";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "./command.tsx";
import { HierarchyCrumb } from "./hierarchy-crumb.tsx";
import { HierarchyOptions } from "./hierarchy-options.tsx";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "./popover.tsx";
import { useHierarchyNavigation } from "./use-hierarchy-navigation.ts";

type HierarchyInputProps = {
  id?: string;
  hierarchy: Hierarchy;
  translate: (code: string) => string;
  count?: (path: string) => number | undefined;
  value: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  isSelectable?: (path: string) => boolean;
  isLevelLocked?: (depth: number) => boolean;
  levelAdornment?: (depth: number) => ReactNode;
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
  count,
  value: path,
  onChange,
  onBlur,
  isSelectable = () => true,
  isLevelLocked,
  levelAdornment,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyText,
  stopLabel,
  removeLabel,
  hint,
  ...aria
}: HierarchyInputProps) {
  const {
    open,
    setOpen,
    search,
    setSearch,
    current,
    isLeaf,
    canStop,
    depth,
    query,
    children,
    close,
    edit,
    pick,
  } = useHierarchyNavigation({
    hierarchy,
    translate,
    path,
    onChange,
    isSelectable,
  });

  const isLocked = (level: number) =>
    disabled === true || isLevelLocked?.(level) === true;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <PopoverAnchor asChild>
        <div
          className={cn(
            "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-0.5 shadow-xs dark:bg-input/30",
            disabled && "bg-input/20",
          )}
        >
          {path.map((nodePath, level) => {
            const nodeLabel = hierarchyPathLabel(
              hierarchy,
              nodePath,
              translate,
            );
            return (
              <HierarchyCrumb
                key={nodePath}
                label={nodeLabel}
                level={level}
                depth={depth}
                locked={isLocked(level)}
                adornment={levelAdornment?.(level)}
                removeLabel={removeLabel(nodeLabel)}
                onEdit={() => edit(level)}
                onRemove={() => onChange(path.slice(0, level))}
              />
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
              className="text-foreground hover:text-accent-foreground h-7 min-w-0 flex-1 justify-between px-1 font-normal hover:bg-transparent disabled:opacity-100 has-[>svg]:px-1"
              {...aria}
            >
              {path.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : null}
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
            <HierarchyOptions
              options={children}
              selected={path[depth]}
              count={count}
              showStop={depth === path.length && path.length > 0 && !query}
              stopLabel={stopLabel}
              onStop={close}
              onPick={pick}
            />
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
