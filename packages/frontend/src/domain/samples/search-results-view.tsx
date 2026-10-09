import type { PublicListedSample } from "@projet-igsn/domain/sample/sample-validator";
import type { ReactNode } from "react";

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
import { SampleList } from "#/domain/samples/sample-list.tsx";
import { m } from "#/paraglide/messages.js";

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
  actions,
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
  actions?: ReactNode;
}) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p role="status" className="text-muted-foreground text-center">
          {emptyMessage}
        </p>
        {actions}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-6 flex items-center justify-between gap-4">
        <ResultsCount total={total} />
        <div className="flex items-center gap-4">
          <PageSizeSelect
            perPage={perPage}
            pageSizes={PAGE_SIZES}
            label={m.search_per_page()}
            onPerPageChange={onPerPageChange}
          />
          <CardFieldPicker fields={fields} onFieldsChange={onFieldsChange} />
          {actions}
        </div>
      </div>
      <SampleList samples={samples} query={query} fields={fields} />

      {pageCount > 1 ? (
        <nav
          aria-label={m.pagination_label()}
          className="mt-8 flex items-center justify-center gap-4"
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
