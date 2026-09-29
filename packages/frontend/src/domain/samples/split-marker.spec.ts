import type { SampleMapCluster } from "@projet-igsn/domain/sample/map/model";

import { splitOrigin } from "./split-marker.tsx";

const group = (
  longitude: number,
  latitude: number,
  count: number,
): SampleMapCluster => ({
  longitude,
  latitude,
  count,
  extent: {
    west: longitude - 1,
    south: latitude - 1,
    east: longitude + 1,
    north: latitude + 1,
  },
});

describe("splitOrigin", () => {
  const previous = [group(5, 45, 10)];

  it("should start a marker from the larger group it split out of", () => {
    expect(splitOrigin(previous, group(5.5, 45.5, 3))).toEqual([45, 5]);
  });

  it.each([
    { reason: "outside every previous group", cluster: group(20, 45, 3) },
    { reason: "merging groups on zoom out", cluster: group(5, 45, 12) },
  ])("should not animate a marker $reason", ({ cluster }) => {
    expect(splitOrigin(previous, cluster)).toBeUndefined();
  });
});
