import type { VerticalReference } from "@projet-igsn/domain/sample/location/vertical-reference";

import { m } from "#/paraglide/messages.js";
import { verticalReferenceLabel } from "#/samples/sample-labels.ts";

export const verticalPositionLegend = (
  index: number,
  reference: VerticalReference | null | undefined,
): string =>
  m.legend_vertical_position({
    index: index + 1,
    reference: reference
      ? verticalReferenceLabel(reference)
      : m.field_vertical_position(),
  });
