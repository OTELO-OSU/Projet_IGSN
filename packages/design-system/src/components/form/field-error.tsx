import { useFieldContext } from "./form-hook-contexts.tsx";

type FieldErrorState = {
  error: { message: string } | undefined;
  errorId: string;
  ariaProps: {
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
  };
};

export function useFieldError({
  waitForTouch = false,
  hintId,
}: { waitForTouch?: boolean; hintId?: string } = {}): FieldErrorState {
  const field = useFieldContext();
  const { errors, errorMap, isTouched } = field.state.meta;
  const error = !waitForTouch || isTouched ? errors[0] : errorMap.onSubmit;
  const errorId = `${field.name}-error`;
  return {
    error,
    errorId,
    ariaProps: {
      "aria-invalid": error ? true : undefined,
      "aria-describedby": (error ? errorId : hintId) ?? undefined,
    },
  };
}

export function FieldError({
  error,
  errorId,
}: Pick<FieldErrorState, "error" | "errorId">) {
  return error ? (
    <p id={errorId} role="alert" className="text-destructive text-sm">
      {error.message}
    </p>
  ) : null;
}
