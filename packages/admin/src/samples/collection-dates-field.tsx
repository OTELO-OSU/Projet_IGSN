import { Combobox } from "@projet-igsn/design-system/components/ui/combobox";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useDescriptionForm } from "#/samples/use-description-form.ts";

const modeItems = [
  { value: "single", label: m.collection_date_mode_single() },
  { value: "range", label: m.collection_date_mode_range() },
];

// The collection date group (required to publish, hence the "*" markers). The
// form store only ever holds the canonical range; the single-date/range mode
// is component state, an implementation detail never submitted. On mount it
// derives from the stored value (start === end, or nothing yet, reads as a
// single date). In single mode the one input mirrors into both ends of the
// degenerate range (ADR 0015); in range mode entering the same date on both
// ends is rejected here, since that is what single mode is for.
export function CollectionDatesField() {
  const form = useDescriptionForm();
  const [mode, setMode] = useState<"single" | "range">(() => {
    const { collectionDateStart, collectionDateEnd } =
      form.state.values.description;
    return collectionDateStart === collectionDateEnd ? "single" : "range";
  });

  const selectMode = (value: string) => {
    if (value !== "single" && value !== "range") return;
    setMode(value);
    // Collapsing a range keeps its start; the end mirrors it again so the
    // store never carries a stale bound the single input cannot show.
    if (value === "single") {
      form.setFieldValue(
        "description.collectionDateEnd",
        form.getFieldValue("description.collectionDateStart"),
      );
    }
    // The identical-range errors belong to the mode that raised them; field
    // meta outlives the unmounted inputs, so clear it or it would block submit.
    for (const name of [
      "description.collectionDateStart",
      "description.collectionDateEnd",
    ] as const) {
      form.setFieldMeta(name, (meta) => ({ ...meta, errorMap: {} }));
    }
  };

  // Equal bounds are valid domain data (the degenerate single date), so this
  // is UI steering toward single mode, not schema validation; every other
  // date rule (future, ordering) comes from the domain schema via the form's
  // live validator. Runs on both fields (each listens to its sibling), so the
  // advice reads on both.
  const identicalRange = () => {
    const start = form.getFieldValue("description.collectionDateStart");
    const end = form.getFieldValue("description.collectionDateEnd");
    return start !== undefined && start === end
      ? { message: m.collection_date_range_identical() }
      : undefined;
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="collection-date-mode">
          {`${m.field_collection_date_mode()} *`}
        </Label>
        <Combobox
          id="collection-date-mode"
          value={mode}
          onChange={selectMode}
          items={modeItems}
          placeholder={m.collection_date_mode_placeholder()}
          searchPlaceholder={m.collection_date_mode_search_placeholder()}
          emptyText={m.collection_date_mode_empty()}
        />
      </div>
      {mode === "single" ? (
        <form.AppField
          name="description.collectionDateStart"
          listeners={{
            onChange: ({ value }) =>
              form.setFieldValue("description.collectionDateEnd", value),
          }}
        >
          {(field) => (
            <field.DateField label={`${m.field_collection_date()} *`} />
          )}
        </form.AppField>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField
            name="description.collectionDateStart"
            validators={{
              onChangeListenTo: ["description.collectionDateEnd"],
              onChange: identicalRange,
            }}
          >
            {(field) => (
              <field.DateField label={`${m.field_collection_date_start()} *`} />
            )}
          </form.AppField>
          <form.AppField
            name="description.collectionDateEnd"
            validators={{
              onChangeListenTo: ["description.collectionDateStart"],
              onChange: identicalRange,
            }}
          >
            {(field) => (
              <field.DateField label={`${m.field_collection_date_end()} *`} />
            )}
          </form.AppField>
        </div>
      )}
    </div>
  );
}
