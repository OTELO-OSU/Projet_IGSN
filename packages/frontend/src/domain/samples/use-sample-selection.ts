import {
  type OnChangeFn,
  type RowSelectionState,
  functionalUpdate,
} from "@tanstack/react-table";
import { useState } from "react";

import type { SearchParams } from "#/domain/samples/search-params.ts";

const filterKey = (search: SearchParams): string =>
  JSON.stringify({
    ...search,
    page: undefined,
    perPage: undefined,
    map: undefined,
  });

export function useSampleSelection(
  search: SearchParams,
): [RowSelectionState, OnChangeFn<RowSelectionState>] {
  const key = filterKey(search);
  const [state, setState] = useState<{
    key: string;
    selection: RowSelectionState;
  }>({ key, selection: {} });
  if (state.key !== key) setState({ key, selection: {} });

  return [
    state.key === key ? state.selection : {},
    (updater) =>
      setState((prev) => ({
        key,
        selection: functionalUpdate(updater, prev.selection),
      })),
  ];
}
