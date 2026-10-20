import { m } from "#/paraglide/messages.js";

export const REASON_MESSAGES: Record<string, (() => string) | undefined> = {
  collection_date_future: m.field_collection_date_future,
  collection_date_order: m.field_collection_date_order,
  synthesis_date_future: m.field_synthesis_date_future,
  synthesis_date_order: m.field_synthesis_date_order,
  process_date_future: m.field_process_date_future,
  process_date_order: m.field_process_date_order,
  humidity_percentage_range: m.field_humidity_percentage_range,
  numeric_range_order: m.field_numeric_range_order,
  vertical_position_order: m.field_vertical_position_order,
  area_latitude_order: m.field_area_latitude_order,
};
