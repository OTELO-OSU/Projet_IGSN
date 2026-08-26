export const likePattern = (search: string) =>
  `%${search.replace(/[\\%_]/g, "\\$&")}%`;
