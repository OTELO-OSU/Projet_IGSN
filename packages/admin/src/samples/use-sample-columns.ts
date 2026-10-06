import { useState } from "react";

const DEFAULT_COLUMNS = ["type", "material", "location", "collectorName"];

export function useSampleColumns(
  offered: readonly string[],
  moderated: boolean,
): {
  columns: string[];
  saveColumns: (columns: string[]) => void;
} {
  const storageKey = moderated
    ? "admin-moderation-sample-columns"
    : "admin-sample-columns";
  const [columns, setColumns] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === null) {
      return DEFAULT_COLUMNS;
    }
    return stored.split(",").filter((key) => offered.includes(key));
  });

  return {
    columns,
    saveColumns: (next) => {
      setColumns(next);
      localStorage.setItem(storageKey, next.join(","));
    },
  };
}
