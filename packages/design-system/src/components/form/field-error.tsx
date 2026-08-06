import { useFieldContext } from "./form-hook-contexts.tsx";

type FieldErrorState = {
  error: { message: string } | undefined;
  errorId: string;
  ariaProps: {
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
  };
};

// `waitForTouch` picks the derivation policy, which differs by design: a
// combobox requirement raised by a sibling change (a unit once its value is
// entered) stays hidden until the user acts on the field, falling back to
// submit-sourced errors since a field unmounted at submit time (on a hidden
// tab) is never marked touched; the text-like fields show errors immediately,
// so a range bound's sibling error appears while the pair is being edited.
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
      "aria-describedby":
        [hintId, error ? errorId : undefined].filter(Boolean).join(" ") ||
        undefined,
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
