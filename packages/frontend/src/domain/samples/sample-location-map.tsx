import type { Location } from "@projet-igsn/domain/sample/location/model";
import type { LatLngBoundsExpression } from "leaflet";

import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Rectangle,
  Tooltip,
  useMap,
} from "react-leaflet";

import {
  OsmTileLayer,
  WORLD_BOUNDS,
  toBoundsList,
} from "#/domain/samples/search-location-map.tsx";
import { m } from "#/paraglide/messages.js";

type Position = NonNullable<Location["position"]>;
type Area = Extract<Position, { type: "area" }>;

const ZOOM = 5;
const DOT = { color: "#dc2626", fillColor: "#dc2626", fillOpacity: 1 };

const asPoint = (position: Position): Position =>
  position.type === "area" &&
  position.westLongitude === position.eastLongitude &&
  position.southLatitude === position.northLatitude
    ? {
        type: "point",
        latitude: position.southLatitude,
        longitude: position.westLongitude,
      }
    : position;

const areaHalves = (area: Area) =>
  toBoundsList({
    west: area.westLongitude,
    south: area.southLatitude,
    east: area.eastLongitude,
    north: area.northLatitude,
  });

function fittedBounds(
  shape: Exclude<Position, { type: "point" }>,
): LatLngBoundsExpression {
  if (shape.type === "line") {
    return [
      [shape.startLatitude, shape.startLongitude],
      [shape.endLatitude, shape.endLongitude],
    ];
  }
  const [half, ...rest] = areaHalves(shape);
  return half && rest.length === 0 ? half : WORLD_BOUNDS;
}

export function SampleShape({ position }: { position: Position }) {
  const map = useMap();
  useEffect(() => {
    const shape = asPoint(position);
    if (shape.type === "point") {
      map.setView([shape.latitude, shape.longitude], ZOOM, { animate: false });
    } else {
      map.fitBounds(fittedBounds(shape), { maxZoom: ZOOM, animate: false });
    }
  }, [map, position]);

  const shape = asPoint(position);
  switch (shape.type) {
    case "point":
      return (
        <CircleMarker
          center={[shape.latitude, shape.longitude]}
          radius={6}
          pathOptions={DOT}
        >
          <Tooltip>
            {m.sample_map_point_tooltip({
              latitude: shape.latitude,
              longitude: shape.longitude,
            })}
          </Tooltip>
        </CircleMarker>
      );
    case "area": {
      const tooltip = m.sample_map_area_tooltip({
        west: shape.westLongitude,
        east: shape.eastLongitude,
        south: shape.southLatitude,
        north: shape.northLatitude,
      });
      return areaHalves(shape).map((bounds) => (
        <Rectangle key={JSON.stringify(bounds)} bounds={bounds}>
          <Tooltip>{tooltip}</Tooltip>
        </Rectangle>
      ));
    }
    case "line":
      return (
        <Polyline
          positions={[
            [shape.startLatitude, shape.startLongitude],
            [shape.endLatitude, shape.endLongitude],
          ]}
        >
          <Tooltip>
            {m.sample_map_line_tooltip({
              startLongitude: shape.startLongitude,
              startLatitude: shape.startLatitude,
              endLongitude: shape.endLongitude,
              endLatitude: shape.endLatitude,
            })}
          </Tooltip>
        </Polyline>
      );
  }
}

export function SampleLocationMap({ position }: { position: Position }) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxBounds={WORLD_BOUNDS}
      maxBoundsViscosity={1}
      className="z-0 h-full w-full rounded-md"
    >
      <OsmTileLayer />
      <SampleShape position={position} />
    </MapContainer>
  );
}
