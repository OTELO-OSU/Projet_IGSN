import type { Location } from "@projet-igsn/domain/sample/location/model";

import { Suspense, lazy, useEffect, useState } from "react";

import { m } from "#/paraglide/messages.js";

const SampleLocationMap = lazy(() =>
  import("#/domain/samples/sample-location-map.tsx").then((module) => ({
    default: module.SampleLocationMap,
  })),
);

export function LazySampleLocationMap({
  position,
}: {
  position: NonNullable<Location["position"]>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div role="group" aria-label={m.sample_map_label()} className="h-80">
      {mounted ? (
        <Suspense fallback={null}>
          <SampleLocationMap position={position} />
        </Suspense>
      ) : null}
    </div>
  );
}
