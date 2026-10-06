import type { SampleMapCluster } from "@projet-igsn/domain/sample/map/model";
import type L from "leaflet";

import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Marker } from "react-leaflet";

import { prefersReducedMotion } from "#/prefers-reduced-motion.ts";

const SPLIT_MS = 300;
const EXTENT_PAD_DEGREES = 1e-6;

export function splitOrigin(
  previous: SampleMapCluster[],
  { longitude, latitude, count }: SampleMapCluster,
): L.LatLngTuple | undefined {
  const parent = previous.find(
    (cluster) =>
      cluster.count > count &&
      longitude >= cluster.extent.west - EXTENT_PAD_DEGREES &&
      longitude <= cluster.extent.east + EXTENT_PAD_DEGREES &&
      latitude >= cluster.extent.south - EXTENT_PAD_DEGREES &&
      latitude <= cluster.extent.north + EXTENT_PAD_DEGREES,
  );
  return parent && [parent.latitude, parent.longitude];
}

export function SplitMarker({
  from,
  position,
  ...props
}: ComponentProps<typeof Marker> & {
  from?: () => L.LatLngTuple | undefined;
  position: L.LatLngTuple;
}) {
  const markerRef = useRef<L.Marker>(null);
  const [origin, setOrigin] = useState(() =>
    from && !prefersReducedMotion() ? from() : undefined,
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !origin) return;
    const [fromLatitude, fromLongitude] = origin;
    const [toLatitude, toLongitude] = position;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min((now - start) / SPLIT_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      marker.setLatLng([
        fromLatitude + (toLatitude - fromLatitude) * eased,
        fromLongitude + (toLongitude - fromLongitude) * eased,
      ]);
      if (progress < 1) frame = requestAnimationFrame(step);
      else setOrigin(undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [origin]);

  return <Marker ref={markerRef} position={origin ?? position} {...props} />;
}
