import { m } from "#/paraglide/messages.js";
import { DateRangeField } from "#/samples/date-range-field.tsx";

export function CollectionDateField() {
  return (
    <DateRangeField
      prefix="description.collectionDate"
      id="collection-dates"
      groupLabel={m.field_collection_dates()}
      rangeModeLabel={m.collection_date_mode_range()}
      timeModeLabel={m.collection_date_mode_time()}
      timeZoneLabel={m.field_collection_time_zone()}
      singleLabel={m.field_collection_date()}
      startLabel={m.field_collection_date_start()}
      endLabel={m.field_collection_date_end()}
      identicalMessage={m.collection_date_range_identical}
    />
  );
}
