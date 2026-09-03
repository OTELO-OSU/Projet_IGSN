import type { Description } from "@projet-igsn/domain/sample/description/model";

import { sql } from "kysely";

export function descriptionColumns(
  description: Description | null | undefined,
) {
  const collectionDate = description?.collectionDate;
  const timeZone =
    collectionDate?.precision === "hour" ? collectionDate.timeZone : null;
  const instant = (wallClock: string) =>
    sql<string>`${wallClock}::timestamp AT TIME ZONE ${timeZone ?? "UTC"}`;
  return {
    collection_date_start: collectionDate
      ? instant(collectionDate.start)
      : null,
    collection_date_end: collectionDate ? instant(collectionDate.end) : null,
    collection_date_precision: collectionDate?.precision ?? null,
    collection_date_time_zone: timeZone,
    oriented: description?.oriented ?? null,
    orientation_explanation: description?.orientationExplanation ?? null,
    open_description: description?.openDescription ?? null,
    length_value: description?.length?.value ?? null,
    length_unit: description?.length?.unit ?? null,
    width_value: description?.width?.value ?? null,
    width_unit: description?.width?.unit ?? null,
    thickness_value: description?.thickness?.value ?? null,
    thickness_unit: description?.thickness?.unit ?? null,
    mass_value: description?.mass?.value ?? null,
    mass_unit: description?.mass?.unit ?? null,
    volume_value: description?.volume?.value ?? null,
    volume_unit: description?.volume?.unit ?? null,
  };
}
