import type { CoreLocation } from "../core/core-production-schema.ts";
import type { CoreSample } from "../core/core-sample-schema.ts";
import type { ISamplesSample } from "./isamples-schema.ts";

import { toISamplesAgents } from "./to-isamples-agents.ts";

type SamplingEvent = ISamplesSample["produced_by"];

const toSamplingSite = (
  location: CoreLocation | undefined,
): SamplingEvent["sampling_site"] => {
  const placeNames = [
    ...(location?.placeNames ?? []),
    ...(location?.countryCodes ?? []),
    ...(location?.oceanOrSea == null ? [] : [location.oceanOrSea.label]),
  ];
  const description = location?.locationDescription;
  if (placeNames.length === 0 && description == null) return undefined;
  return { description, place_name: placeNames };
};

const toElevation = (
  extent: CoreLocation["verticalExtent"],
): string | undefined =>
  extent?.minimum == null
    ? undefined
    : `${extent.minimum.value} ${extent.minimum.unitCode} ${extent.minimum.reference}`;

const toSampleLocation = (
  location: CoreLocation | undefined,
  sensitiveLocation: boolean,
): SamplingEvent["sample_location"] => {
  if (location == null) return undefined;
  // ponytail: a track or an area emits no coordinates, add the centroid if an integrator needs one
  const point =
    !sensitiveLocation && location.geometry?.type === "Point"
      ? location.geometry.coordinates
      : undefined;
  return {
    latitude: point?.[1],
    longitude: point?.[0],
    elevation: toElevation(location.verticalExtent),
    obfuscated: sensitiveLocation,
  };
};

export function toISamplesSamplingEvent({
  production,
  responsibility,
  rightsAndAccess,
}: CoreSample): SamplingEvent {
  return {
    label: production.samplingSite_name,
    description: production.samplingPurpose,
    responsibility: toISamplesAgents(responsibility, [
      "Collector",
      "ChiefScientist",
      "Researcher",
    ]),
    authorized_by: toISamplesAgents(responsibility, ["Creator"]).map(
      ({ name }) => name,
    ),
    result_time: production.collection_date_start,
    project: production.projects?.[0]?.name,
    sampling_site: toSamplingSite(production.location),
    sample_location: toSampleLocation(
      production.location,
      rightsAndAccess.sensitiveLocation,
    ),
  };
}
