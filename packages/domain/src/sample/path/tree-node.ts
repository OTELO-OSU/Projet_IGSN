// A node in a hierarchical dot-path vocabulary tree (material, sample type,
// collection method). `label` is the node's own code (the i18n label resolves
// from it per app); a node with children MUST be refined unless marked
// `optional: true`, the only valid stops (see isPathComplete); `choices` lists
// the child codes.
// Keying a `Record<string, TreeNode>` by segment lets a segment be reused under
// several parents (the full path is the identity, ADR 0010). A segment with no
// entry defaults to a childless leaf labelled by its own code, so only nodes
// carrying choices, optionality, or a context override need one.
export type TreeNode = {
  label: string;
  optional?: boolean;
  choices?: readonly string[];
};
