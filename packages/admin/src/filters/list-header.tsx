import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@projet-igsn/design-system/components/ui/popover";
import { cn } from "@projet-igsn/design-system/lib/utils";
import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";

export type FilterEntry = {
  name: string;
  label: string;
  active?: boolean;
  onRemove?: () => void;
  className?: string;
  cell: ReactNode;
};

function AddFilter({
  filters,
  onAdd,
}: {
  filters: FilterEntry[];
  onAdd: (name: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" className="w-fit">
          <PlusIcon className="size-4" />
          {m.filter_add()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        {filters.map((filter) => (
          <button
            key={filter.name}
            type="button"
            onClick={() => {
              onAdd(filter.name);
              setIsOpen(false);
            }}
            className="hover:bg-accent w-full rounded px-1 py-1 text-left text-sm"
          >
            {filter.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function ListHeader({
  title,
  action,
  filters,
}: {
  title: string;
  action?: ReactNode;
  filters: FilterEntry[];
}) {
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());

  const isShown = (filter: FilterEntry) =>
    filter.onRemove === undefined ||
    Boolean(filter.active) ||
    added.has(filter.name);
  const hidden = filters.filter((filter) => !isShown(filter));

  const remove = (filter: FilterEntry) => {
    setAdded((previous) => {
      const next = new Set(previous);
      next.delete(filter.name);
      return next;
    });
    filter.onRemove?.();
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          {hidden.length > 0 ? (
            <AddFilter
              filters={hidden}
              onAdd={(name) =>
                setAdded((previous) => new Set(previous).add(name))
              }
            />
          ) : null}
          {action}
        </div>
      </div>

      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filters.filter(isShown).map((filter) => (
          <div
            key={filter.name}
            className={cn("relative grid min-w-0 gap-1.5", filter.className)}
          >
            {filter.onRemove === undefined ? null : (
              <button
                type="button"
                aria-label={m.filter_remove({ name: filter.label })}
                onClick={() => remove(filter)}
                className="hover:bg-accent absolute top-0 right-0 rounded p-0.5"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
            {filter.cell}
          </div>
        ))}
      </div>
    </div>
  );
}
