export type TreeNode = {
  label?: string;
  optional?: boolean;
  choices?: readonly string[];
  searchable?: boolean;
  // Absent (the default): this node's value can no longer change once the
  // sample is published (ADR 0022).
  frozenWhenPublished?: false;
};
