import type { Bbox } from "@projet-igsn/domain/sample/sample-validator";

import { Link } from "@tanstack/react-router";
import L from "leaflet";

import type { SearchFilters } from "#/domain/samples/client/list-samples.ts";

import { useListSamples } from "#/domain/samples/hook/list-samples.ts";
import { formatBbox } from "#/domain/samples/search-location-map.tsx";
import { m } from "#/paraglide/messages.js";

const CLUSTER_PAGE_SIZE = 10;
const CLUSTER_PAD_DEGREES = 1e-4;

const clusterBbox = ({ west, south, east, north }: Bbox) =>
  formatBbox(
    L.latLng(south - CLUSTER_PAD_DEGREES, west - CLUSTER_PAD_DEGREES),
    L.latLng(north + CLUSTER_PAD_DEGREES, east + CLUSTER_PAD_DEGREES),
  );

export function ClusterSamples({
  filters,
  extent,
}: {
  filters: SearchFilters;
  extent: Bbox;
}) {
  const { data } = useListSamples({
    ...filters,
    bbox: clusterBbox(extent),
    page: 1,
    perPage: CLUSTER_PAGE_SIZE,
  });
  const rest = (data.total ?? 0) - data.data.length;
  return (
    <>
      <ul>
        {data.data.map(({ igsn, name }) =>
          igsn ? (
            <li key={igsn}>
              <Link to="/samples/$igsn" params={{ igsn }}>
                {name}
              </Link>
            </li>
          ) : null,
        )}
      </ul>
      {rest > 0 ? <p>{m.results_map_more({ count: rest })}</p> : null}
    </>
  );
}
