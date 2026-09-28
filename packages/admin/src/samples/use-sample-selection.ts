import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";

import { useState } from "react";

import type { SampleListParams } from "#/samples/use-samples.ts";

type Selection = {
  listKey: string;
  rowSelection: RowSelectionState;
  isAllSelected: boolean;
};

const emptySelection = (listKey: string): Selection => ({
  listKey,
  rowSelection: {},
  isAllSelected: false,
});

export type SampleSelection = ReturnType<typeof useSampleSelection>;

export function useSampleSelection(
  params: SampleListParams,
  moderated: boolean,
) {
  const listKey = JSON.stringify({ moderated, ...params });
  const [storedSelection, setSelection] = useState(() =>
    emptySelection(listKey),
  );
  const selection =
    storedSelection.listKey === listKey
      ? storedSelection
      : emptySelection(listKey);
  const ids = Object.keys(selection.rowSelection);
  const {
    page: _page,
    perPage: _perPage,
    sort: _sort,
    order: _order,
    ...query
  } = params;

  const onRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) =>
    setSelection({
      ...emptySelection(listKey),
      rowSelection:
        typeof updater === "function"
          ? updater(selection.rowSelection)
          : updater,
    });

  const exportRequest: ExportSamplesRequest =
    ids.length > 0 && !selection.isAllSelected
      ? { mode: "ids", moderated, ids }
      : { mode: "filters", moderated, query };

  return {
    rowSelection: selection.rowSelection,
    isAllSelected: selection.isAllSelected,
    ids,
    exportRequest,
    onRowSelectionChange,
    selectAll: () => setSelection({ ...selection, isAllSelected: true }),
    clear: () => setSelection(emptySelection(listKey)),
  };
}
