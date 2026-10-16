import L from "leaflet";

import { clamp } from "#/clamp.ts";
import {
  HIGHLIGHT_CLASS,
  MARKER_CLASS,
} from "#/domain/samples/map-sample-marker.tsx";

const MIN_BUBBLE_PX = 24;
const MAX_BUBBLE_PX = 64;
const BUBBLE_PX_PER_DIGIT = 8;

const clusterIcons = new Map<string, L.DivIcon>();
export function clusterIcon(
  count: number,
  isHighlighted: boolean,
  sizePx: number,
): L.DivIcon {
  const key = `${count}:${isHighlighted}:${sizePx}`;
  let icon = clusterIcons.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: `${MARKER_CLASS} text-xs font-semibold text-white ${isHighlighted ? HIGHLIGHT_CLASS : "bg-primary"}`,
      html: `<span aria-hidden="true" class="flex size-full items-center justify-center">${count}</span>`,
      iconSize: [sizePx, sizePx],
    });
    clusterIcons.set(key, icon);
  }
  return icon;
}

export const bubbleSizePx = (count: number, maxCount: number): number =>
  Math.round(
    clamp(
      MAX_BUBBLE_PX * Math.sqrt(count / maxCount),
      Math.max(MIN_BUBBLE_PX, BUBBLE_PX_PER_DIGIT * (String(count).length + 1)),
      MAX_BUBBLE_PX,
    ),
  );
