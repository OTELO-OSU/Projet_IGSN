import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import type { FieldSuggestionRule } from "./field-suggestion-context.tsx";

import { useAppForm } from "./app-form.tsx";
import { FieldSuggestionProvider } from "./field-suggestion-context.tsx";

const parentRule = (
  forField: FieldSuggestionRule["forField"],
): FieldSuggestionRule => ({
  label: "Parent values",
  noValueLabel: "no value",
  booleanLabel: (value) => (value ? "yes" : "no"),
  forField,
});

function Harness({ rule }: { rule: FieldSuggestionRule }) {
  const form = useAppForm({
    defaultValues: { humidity: undefined as number | undefined },
  });
  return (
    <FieldSuggestionProvider value={rule}>
      <form.AppField name="humidity">
        {(field) => <field.SuggestionRow label="Humidity (%)" />}
      </form.AppField>
    </FieldSuggestionProvider>
  );
}

describe("SuggestionRow", () => {
  it("should render the label and the slots when a source holds a value", async () => {
    await render(
      <Harness
        rule={parentRule(() => [
          { source: "IGSN-1", value: 42 },
          { source: "IGSN-2", value: undefined },
        ])}
      />,
    );

    await expect.element(page.getByText("Humidity (%)")).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "IGSN-1: 42" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "IGSN-2: no value" }))
      .toBeDisabled();
  });

  it("should render nothing when no source holds a value", async () => {
    await render(
      <Harness
        rule={parentRule(() => [
          { source: "IGSN-1", value: undefined },
          { source: "IGSN-2", value: undefined },
        ])}
      />,
    );

    await expect
      .element(page.getByText("Humidity (%)"))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("list", { name: "Parent values" }))
      .not.toBeInTheDocument();
  });
});
