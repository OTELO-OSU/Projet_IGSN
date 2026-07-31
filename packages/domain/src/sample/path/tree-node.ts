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
  // A label code naming the level this node opens for its children (e.g.
  // "resource_type" for the level under "yes"), translated like `label`.
  // Absent: the level is labelled by the parent's picked value.
  childLabel?: string;
  // Offered as a public search-facet option (default absent = false). There is
  // no inheritance: each node a facet should expose is flagged on its own (see
  // sample/search/facets.ts).
  searchable?: boolean;
  // Children of this node may still be chosen after publication (ADR 0022);
  // every deeper level is editable too. Absent: the level is frozen once
  // published.
  editableChildren?: boolean;
};
