import { m } from "#/paraglide/messages.js";
import { DateRangeField } from "#/samples/date-range-field.tsx";

export function CollectionDateField() {
  return (
    <DateRangeField
      prefix="description.collectionDate"
      id="collection-dates"
      groupLabel={m.field_collection_dates()}
      rangeModeLabel={m.collection_date_mode_range()}
      singleLabel={m.field_collection_date()}
      startLabel={m.field_collection_date_start()}
      endLabel={m.field_collection_date_end()}
      identicalMessage={m.collection_date_range_identical}
      time={{
        modeLabel: m.collection_date_mode_time(),
        zoneLabel: m.field_collection_time_zone(),
        zonePlaceholder: m.time_zone_placeholder(),
        zoneSearchPlaceholder: m.time_zone_search_placeholder(),
        zoneEmptyText: m.time_zone_empty(),
      }}
    />
  );
}
