import { Button } from "../ui/button.tsx";
import { useFormContext } from "./form-hook-contexts.tsx";

export function SubmitButton({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={disabled || isSubmitting}>
          {label}
        </Button>
      )}
    </form.Subscribe>
  );
}
