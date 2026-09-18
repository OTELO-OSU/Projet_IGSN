import type { CoreSample } from "../core/core-sample-schema.ts";
import type { DataCiteSample } from "./datacite-schema.ts";

type CoreEventType =
  CoreSample["record"]["lifecycleEvents"][number]["eventType"];

type DataCiteDate = DataCiteSample["dates"][number];

const DATE_TYPE_BY_EVENT: Record<
  CoreEventType,
  DataCiteDate["dateType"] | null
> = {
  created: "Created",
  validated: "Valid",
  registered: "Issued",
  published: "Available",
  updated: "Updated",
  withdrawn: "Withdrawn",
  tombstone: null,
};

export function toDataCiteDates(core: CoreSample): DataCiteDate[] {
  const { collection_date_start: start, collection_date_end: end } =
    core.production;
  return [
    ...core.record.lifecycleEvents.flatMap(({ eventType, timestamp }) => {
      const dateType = DATE_TYPE_BY_EVENT[eventType];
      return dateType == null ? [] : [{ date: timestamp, dateType }];
    }),
    { date: start === end ? start : `${start}/${end}`, dateType: "Collected" },
  ];
}
