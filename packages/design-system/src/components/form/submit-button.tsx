import type { ComponentProps } from "react";

import { Button } from "../ui/button.tsx";
import { useFormContext } from "./form-hook-contexts.tsx";

export function SubmitButton({
  label,
  disabled,
  variant,
}: {
  label: string;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          type="submit"
          variant={variant}
          disabled={disabled || isSubmitting}
        >
          {label}
        </Button>
      )}
    </form.Subscribe>
  );
}
