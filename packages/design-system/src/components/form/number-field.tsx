import type { ComponentProps } from "react";

import { TextField } from "./text-field.tsx";

// The form store holds `number | undefined`, never NaN.
export function NumberField(
  props: Omit<ComponentProps<typeof TextField>, "number" | "multiline">,
) {
  return <TextField number {...props} />;
}
