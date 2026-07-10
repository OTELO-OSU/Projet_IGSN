// A node in a hierarchical dot-path vocabulary tree (material, sample type,
// collection method). A node with children MUST be refined unless marked
// `optional: true`, the only valid stops (see isPathComplete); `choices` lists
// the child codes. A node's label code (the i18n label resolves from it per
// app) defaults to its own segment, so bare-segment entries omit `label`; a
// dotted override key always states its `label` explicitly, since the key
// alone does not say which code labels that occurrence.
// Keying a `Record<string, TreeNode>` by segment lets a segment be reused under
// several parents (the full path is the identity, ADR 0010). A segment with no
// entry defaults to a childless leaf, so only nodes carrying choices,
// optionality, or a context override need one.
export type TreeNode = {
  label?: string;
  optional?: boolean;
  choices?: readonly string[];
};
