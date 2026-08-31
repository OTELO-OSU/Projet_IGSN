import type { Location } from "./model.ts";

type Position = NonNullable<Location["position"]>;

export function verticalValues(
  position: Position,
): (number | null | undefined)[] {
  switch (position.type) {
    case "point":
      return [position.vertical?.position];
    case "area":
      return [position.vertical?.min, position.vertical?.max];
    case "line":
      return [position.vertical?.start, position.vertical?.end];
  }
}
