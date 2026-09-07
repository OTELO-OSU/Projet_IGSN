import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import { Fragment, useState } from "react";

import { cn } from "../../lib/utils.ts";
import { withRequired } from "../../lib/with-required.ts";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command.tsx";
import { Label } from "../ui/label.tsx";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover.tsx";
import {
  useFieldDisabled,
  useFieldDisabledRule,
} from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";
import {
  canStopAtPath,
  hierarchyChildren,
  hierarchyPathLabel,
  type Hierarchy,
} from "./hierarchy-select-field.tsx";

const identity = (code: string) => code;

type HierarchyFieldProps = {
  label: string;
  hierarchy: Hierarchy;
  translate?: (code: string) => string;
  requiredToPublish?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  stopLabel: string;
  removeLabel: (label: string) => string;
  mustRefineText: string;
  canRefineText: string;
  disabled?: boolean;
};

export function HierarchyField({
  label,
  hierarchy,
  translate = identity,
  requiredToPublish = false,
  placeholder,
  searchPlaceholder,
  emptyText,
  stopLabel,
  removeLabel,
  mustRefineText,
  canRefineText,
  disabled,
}: HierarchyFieldProps) {
  const field = useFieldContext<string[]>();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingDepth, setEditingDepth] = useState<number | null>(null);

  const isFieldDisabled = useFieldDisabled(disabled);
  const isLevelDisabled = useFieldDisabledRule();
  const isLevelLocked = (level: number) =>
    isFieldDisabled || isLevelDisabled(`${field.name}[${level}]`);

  const path = field.state.value ?? [];
  const current = path.at(-1) ?? null;
  const isLeaf = hierarchyChildren(hierarchy, current).length === 0;

  const hintId = `${field.name}-hint`;
  const { error, errorId, ariaProps } = useFieldError({
    waitForTouch: true,
    hintId,
  });

  const depth = editingDepth ?? path.length;
  const isAppending = depth === path.length;
  const query = search.trim().toLowerCase();
  const children = hierarchyChildren(hierarchy, path[depth - 1] ?? null).filter(
    (child) =>
      !query ||
      hierarchyPathLabel(hierarchy, child, translate)
        .toLowerCase()
        .includes(query),
  );

  const pick = (child: string) => {
    if (child !== path[depth])
      field.handleChange([...path.slice(0, depth), child]);
    setSearch("");
    if (hierarchyChildren(hierarchy, child).length === 0) setOpen(false);
    else setEditingDepth(depth + 1);
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>
        {withRequired(label, requiredToPublish)}
      </Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setSearch("");
            setEditingDepth(null);
          }
        }}
      >
        <PopoverAnchor asChild>
          <div
            className={cn(
              "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1",
              isFieldDisabled && "opacity-50",
            )}
          >
            {path.map((nodePath, level) => {
              const nodeLabel = hierarchyPathLabel(
                hierarchy,
                nodePath,
                translate,
              );
              const locked = isLevelLocked(level);
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
                      editingDepth !== null &&
                        level === depth &&
                        "ring-2 ring-ring",
                      editingDepth !== null && level > depth && "opacity-50",
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
                          onClick={() =>
                            field.handleChange(path.slice(0, level))
                          }
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
            {current !== null && !isLeaf ? (
              <span id={hintId} className="text-muted-foreground text-xs">
                {canStopAtPath(hierarchy, current) ? (
                  <>
                    <span aria-hidden>(&gt; ...)</span>
                    <span className="sr-only">{canRefineText}</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden>&gt; ...</span>
                    <span className="sr-only">{mustRefineText}</span>
                  </>
                )}
              </span>
            ) : null}
            <PopoverTrigger asChild>
              <Button
                id={field.name}
                type="button"
                variant="ghost"
                role="combobox"
                aria-expanded={open}
                disabled={isLevelLocked(path.length) || isLeaf}
                onBlur={field.handleBlur}
                onClick={() => setEditingDepth(null)}
                className="text-muted-foreground h-7 flex-1 justify-between px-1 font-normal hover:bg-transparent"
                {...ariaProps}
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
                {isAppending && path.length > 0 && !query ? (
                  <CommandItem value="-" onSelect={() => setOpen(false)}>
                    {stopLabel}
                  </CommandItem>
                ) : null}
                {children.map((child) => (
                  <CommandItem
                    key={child}
                    value={child}
                    aria-checked={child === path[depth]}
                    onSelect={() => pick(child)}
                  >
                    <CheckIcon
                      className={cn(
                        child === path[depth] ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {hierarchyPathLabel(hierarchy, child, translate)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FieldError error={error} errorId={errorId} />
    </div>
  );
}
