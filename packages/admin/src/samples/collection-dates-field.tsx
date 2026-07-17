import { Label } from "@projet-igsn/design-system/components/ui/label";
import { Switch } from "@projet-igsn/design-system/components/ui/switch";
import { withRequired } from "@projet-igsn/design-system/lib/with-required";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useDescriptionForm } from "#/samples/use-description-form.ts";

// The collection date group (required to publish, hence the "*" markers). The
// form store only ever holds the canonical range; the single-date/range mode
// is component state, an implementation detail never submitted. On mount it
// derives from the stored value (start === end, or nothing yet, reads as a
// single date). In single mode the one input mirrors into both ends of the
// degenerate range (ADR 0015); in range mode entering the same date on both
// ends is rejected here, since that is what single mode is for.
export function CollectionDatesField() {
  const form = useDescriptionForm();
  const [isRange, setIsRange] = useState(() => {
    const { collectionDateStart, collectionDateEnd } =
      form.state.values.description;
    return collectionDateStart !== collectionDateEnd;
  });

  const toggleRange = (checked: boolean) => {
    setIsRange(checked);
    // Collapsing a range keeps its start; the end mirrors it again so the
    // store never carries a stale bound the single input cannot show.
    if (!checked) {
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
    // A legend cannot share its line with the switch, so the group role +
    // labelledby carries the "Collection date" name instead of a fieldset.
    <div
      role="group"
      aria-labelledby="collection-dates-label"
      className="grid gap-2"
    >
      <div className="flex items-center gap-4">
        <span
          id="collection-dates-label"
          className="text-sm leading-none font-medium"
        >
          {withRequired(m.field_collection_dates(), true)}
        </span>
        <div className="flex items-center gap-2">
          <Switch
            id="collection-date-mode"
            checked={isRange}
            onCheckedChange={toggleRange}
          />
          <Label htmlFor="collection-date-mode">
            {m.collection_date_mode_range()}
          </Label>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        {isRange ? (
          <>
            <div className="flex-1">
              <form.AppField
                name="description.collectionDateStart"
                validators={{
                  onChangeListenTo: ["description.collectionDateEnd"],
                  onChange: identicalRange,
                }}
              >
                {(field) => (
                  <field.DateField
                    label={withRequired(m.field_collection_date_start(), true)}
                  />
                )}
              </form.AppField>
            </div>
            <div className="flex-1">
              <form.AppField
                name="description.collectionDateEnd"
                validators={{
                  onChangeListenTo: ["description.collectionDateStart"],
                  onChange: identicalRange,
                }}
              >
                {(field) => (
                  <field.DateField
                    label={withRequired(m.field_collection_date_end(), true)}
                  />
                )}
              </form.AppField>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <form.AppField
              name="description.collectionDateStart"
              listeners={{
                onChange: ({ value }) =>
                  form.setFieldValue("description.collectionDateEnd", value),
              }}
            >
              {(field) => (
                <field.DateField
                  label={withRequired(m.field_collection_date(), true)}
                />
              )}
            </form.AppField>
          </div>
        )}
      </div>
    </div>
  );
}
