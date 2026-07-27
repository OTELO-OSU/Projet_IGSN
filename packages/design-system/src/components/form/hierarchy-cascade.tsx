import type { ReactNode } from "react";

import {
  type Hierarchy,
  hierarchyChildLabel,
} from "./hierarchy-select-field.tsx";

// The child path of `parent` that the current dot-path value selects at this
// level, or "" when the value does not descend through this level.
export function selectedChild(
  parent: string | null,
  value: string | undefined,
): string {
  if (!value) return "";
  const depth = parent ? parent.split(".").length : 0;
  const segments = value.split(".");
  if (segments.length <= depth) return "";
  const prefix = segments.slice(0, depth + 1).join(".");
  if (parent && !prefix.startsWith(`${parent}.`)) return "";
  return prefix;
}

type ComboboxItem = { value: string; label: string };

type RenderLevelArgs = {
  parent: string | null;
  depth: number;
  label: string;
  items: ComboboxItem[];
  // The child path currently picked at this level (a full dot-path), or "".
  current: string;
  // Report a new pick: the chosen child, or the parent (or undefined at the
  // root) when the level is cleared.
  onPick: (picked: string | undefined) => void;
};

type HierarchyCascadeProps = {
  // The vocabulary tree; deeper-level labels derive from it.
  hierarchy: Hierarchy;
  // Translates a node's label code; owned by the calling package (i18n rule).
  translate: (code: string) => string;
  // The current dot-path selection; used ONLY to decide how deep to recurse.
  value: string | undefined;
  // Fired when a level is picked or cleared. Optional: a caller whose leaf
  // self-writes its value (e.g. a bound form field) can ignore it.
  onChange?: (value: string | undefined) => void;
  // Label of the first level; deeper levels are labelled by their parent value.
  rootLabel: string;
  // The children offered at a level; the caller filters however it wants (all
  // vs searchable-only), so the cascade stays ignorant of that policy.
  itemsAt: (parent: string | null) => ComboboxItem[];
  // Renders one level's control; the cascade owns only the recursion.
  renderLevel: (args: RenderLevelArgs) => ReactNode;
};

type CascadeLevelProps = Omit<HierarchyCascadeProps, "rootLabel"> & {
  parent: string | null;
  depth: number;
  label: string;
};

function CascadeLevel({
  hierarchy,
  translate,
  value,
  onChange,
  itemsAt,
  renderLevel,
  parent,
  depth,
  label,
}: CascadeLevelProps) {
  const items = itemsAt(parent);
  if (!items.length) return null; // Nothing to offer: the cascade ends here.

  const current = selectedChild(parent, value);
  const child =
    current && items.some((item) => item.value === current) ? current : null;

  return (
    <>
      {renderLevel({
        parent,
        depth,
        label,
        items,
        current,
        onPick: (picked) => onChange?.(picked || parent || undefined),
      })}
      {child ? (
        <CascadeLevel
          hierarchy={hierarchy}
          translate={translate}
          value={value}
          onChange={onChange}
          itemsAt={itemsAt}
          renderLevel={renderLevel}
          parent={child}
          depth={depth + 1}
          label={hierarchyChildLabel(hierarchy, child, translate)}
        />
      ) : null}
    </>
  );
}

// A headless cascade over a hierarchical controlled vocabulary: one level per
// tree depth, walking as deep as the picked path goes. It owns only the
// recursion; the caller supplies the value source (`value`/`onChange`), the
// per-level choices (`itemsAt`), and the level markup (`renderLevel`).
export function HierarchyCascade({
  rootLabel,
  ...rest
}: HierarchyCascadeProps) {
  return <CascadeLevel {...rest} parent={null} depth={0} label={rootLabel} />;
}
