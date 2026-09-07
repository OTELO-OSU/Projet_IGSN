export type TreeNode = {
  label?: string;
  optional?: boolean;
  choices?: readonly string[];
  searchable?: boolean;
  frozenWhenPublished?: false;
};
