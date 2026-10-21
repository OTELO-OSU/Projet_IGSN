import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";

import { isMassImportableMaterial } from "@projet-igsn/domain/sample/import/is-mass-importable-material";
import { useState } from "react";

import { type SampleListParams, useSamples } from "#/samples/use-samples.ts";

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
  const { data } = useSamples(params, moderated);
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

  const isExportable = (data?.data ?? []).some(
    ({ id, material }) =>
      selection.rowSelection[id] &&
      (material === null || isMassImportableMaterial(material)),
  );

  const exportRequest: ExportSamplesRequest | null =
    ids.length === 0 || selection.isAllSelected
      ? { mode: "filters", moderated, query }
      : isExportable
        ? { mode: "ids", moderated, ids }
        : null;

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
