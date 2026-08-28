import type { ComponentProps } from "react";

import { Button } from "../ui/button.tsx";
import { useFormContext } from "./form-hook-contexts.tsx";

export function SubmitButton({
  label,
  disabled,
  variant,
  className,
}: {
  label: string;
  disabled?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          type="submit"
          variant={variant}
          className={className}
          disabled={disabled || isSubmitting}
        >
          {label}
        </Button>
      )}
    </form.Subscribe>
  );
}
