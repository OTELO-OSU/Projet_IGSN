import { useState } from "react";

const STORAGE_KEY = "admin-sample-columns";

const DEFAULT_COLUMNS = ["type", "material", "location", "collectorName"];

export function useSampleColumns(offered: readonly string[]): {
  columns: string[];
  saveColumns: (columns: string[]) => void;
} {
  const [columns, setColumns] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null
      ? DEFAULT_COLUMNS
      : stored.split(",").filter((key) => offered.includes(key));
  });

  return {
    columns,
    saveColumns: (next) => {
      setColumns(next);
      localStorage.setItem(STORAGE_KEY, next.join(","));
    },
  };
}
