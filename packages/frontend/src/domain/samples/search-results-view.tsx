import type { PublicListedSample } from "@projet-igsn/domain/sample/sample-validator";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import type { ReactNode } from "react";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import { FieldPicker } from "@projet-igsn/design-system/components/ui/field-picker";
import {
  Pager,
  PageSizeSelect,
} from "@projet-igsn/design-system/components/ui/pagination";
import { PAGE_SIZES } from "@projet-igsn/domain/sample/sample-validator";

import {
  PICKABLE_FIELDS,
  pickedCardFieldKeys,
} from "#/domain/samples/card-fields.ts";
import { ResultsMapButton } from "#/domain/samples/results-map-dialog.tsx";
import { ResultsViewToggle } from "#/domain/samples/results-view-toggle.tsx";
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { SampleTable } from "#/domain/samples/sample-table.tsx";
import { useStoredFlag } from "#/domain/samples/use-stored-flag.ts";
import { m } from "#/paraglide/messages.js";
import { SEARCH_CSV_EXPORT_LIMIT } from "#/search-export-limit.ts";

const TABLE_VIEW_KEY = "sample-results-table-view";

export function ResultsCount({ total }: { total: number }) {
  return (
    <p className="text-muted-foreground">
      {total === 1
        ? m.search_results_count_one()
        : m.search_results_count({ count: total })}
    </p>
  );
}

export function CardFieldPicker({
  fields,
  onFieldsChange,
}: {
  fields?: string[];
  onFieldsChange: (fields: string[]) => void;
}) {
  return (
    <FieldPicker
      fields={PICKABLE_FIELDS.map((field) => ({
        key: field.key,
        label: field.label(),
        section: field.section(),
        locked: field.locked,
      }))}
      selected={fields ?? []}
      onSelectedChange={(next) => onFieldsChange(pickedCardFieldKeys(next))}
      triggerLabel={m.card_fields_add()}
      triggerVariant="ghost"
      legend={m.card_fields_legend()}
    />
  );
}

function SelectionLine({
  count,
  onClear,
}: {
  count: number;
  onClear: () => void;
}) {
  return (
    <div role="status" className="flex items-center justify-end gap-2">
      {count > 0 ? (
        <>
          <span className="text-muted-foreground text-sm">
            {m.samples_selected_count({ count })}
            {count >= SEARCH_CSV_EXPORT_LIMIT
              ? ` ${m.samples_selection_cap_reached()}`
              : null}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {m.samples_selection_clear()}
          </Button>
        </>
      ) : null}
    </div>
  );
}

export function SearchResultsView({
  samples,
  total,
  query,
  page,
  pageCount,
  perPage,
  fields,
  emptyMessage,
  onPageChange,
  onPerPageChange,
  onFieldsChange,
  selection,
  onSelectionChange,
  download,
  onMapOpen,
}: {
  samples: PublicListedSample[];
  total: number;
  query?: string;
  page: number;
  pageCount: number;
  perPage: number;
  fields?: string[];
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onFieldsChange: (fields: string[]) => void;
  selection: RowSelectionState;
  onSelectionChange: OnChangeFn<RowSelectionState>;
  download?: ReactNode;
  onMapOpen: () => void;
}) {
  const [isTableView, saveTableView] = useStoredFlag(TABLE_VIEW_KEY);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p role="status" className="text-muted-foreground text-center">
          {emptyMessage}
        </p>
        <ResultsMapButton onClick={onMapOpen} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-2 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <ResultsCount total={total} />
          <PageSizeSelect
            perPage={perPage}
            pageSizes={PAGE_SIZES}
            label={m.search_per_page()}
            onPerPageChange={onPerPageChange}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4">
          {download}
          <CardFieldPicker fields={fields} onFieldsChange={onFieldsChange} />
          <ResultsViewToggle
            isTableView={isTableView}
            onTableViewChange={saveTableView}
            onMapOpen={onMapOpen}
          />
        </div>
        <SelectionLine
          count={Object.keys(selection).length}
          onClear={() => onSelectionChange({})}
        />
      </div>
      {isTableView ? (
        <>
          <div className="phone:hidden">
            <SampleTable
              samples={samples}
              query={query}
              fields={fields ?? []}
              selection={selection}
              onSelectionChange={onSelectionChange}
              maxSelected={SEARCH_CSV_EXPORT_LIMIT}
            />
          </div>
          <div className="phone:block hidden">
            <SampleList samples={samples} query={query} fields={fields} />
          </div>
        </>
      ) : (
        <SampleList samples={samples} query={query} fields={fields} />
      )}

      {pageCount > 1 ? (
        <nav
          aria-label={m.pagination_label()}
          className="mt-8 flex items-center justify-between gap-4 md:justify-center max-md:[&>button]:h-11"
        >
          <Pager
            page={page}
            pageCount={pageCount}
            previousLabel={m.pagination_previous()}
            nextLabel={m.pagination_next()}
            onPageChange={onPageChange}
          />
        </nav>
      ) : null}
    </div>
  );
}
