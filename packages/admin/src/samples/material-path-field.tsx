import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { materialChildren } from "@projet-igsn/domain/sample/material-children";

import { m } from "#/paraglide/messages.js";
import { materialCascadeLevels } from "#/samples/material-cascade-levels.ts";
import { materialPathLabel } from "#/samples/material-path-label.ts";

type MaterialPathFieldProps = {
  value: string;
  onChange: (path: string) => void;
};

// Cascading comboboxes over the fixed material tree. Each level lists the
// children of the level above; selecting a node sets the whole path to that
// node (which recomputes and truncates any deeper levels). Stops at a leaf.
export function MaterialPathField({ value, onChange }: MaterialPathFieldProps) {
  const levels = materialCascadeLevels(value);
  return (
    <div className="grid gap-4">
      {levels.map((level, index) => {
        const items = materialChildren(level.parent).map((path) => ({
          value: path,
          label: materialPathLabel(path),
        }));
        const id = `material-level-${index}`;
        const label =
          level.parent === null
            ? `${m.field_material()} *`
            : materialPathLabel(level.parent);
        return (
          // Key on the level's own node (its parent), not the array index: when
          // an upper level changes, deeper rows must remount so a Combobox's
          // open/search state never leaks onto a different item set.
          <div key={level.parent ?? "root"} className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Combobox
              id={id}
              value={level.value}
              onChange={onChange}
              items={items}
              placeholder={
                index === 0
                  ? m.material_placeholder()
                  : m.material_level_placeholder()
              }
              searchPlaceholder={m.material_search_placeholder()}
              emptyText={m.material_empty()}
            />
          </div>
        );
      })}
    </div>
  );
}
