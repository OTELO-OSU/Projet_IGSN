import type { ReactNode } from "react";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";
import { FieldAdornmentProvider } from "./field-adornment-context.tsx";

function Harness({ adornField }: { adornField?: (name: string) => ReactNode }) {
  const form = useAppForm({ defaultValues: { name: "" } });
  const field = (
    <form>
      <form.AppField name="name">
        {(field) => <field.TextField label="Sample name" />}
      </form.AppField>
    </form>
  );
  if (!adornField) return field;
  return (
    <FieldAdornmentProvider value={adornField}>{field}</FieldAdornmentProvider>
  );
}

describe("FieldAdornmentProvider", () => {
  it("should render the node its rule returns beside a field label that still labels the input", async () => {
    await render(
      <Harness
        adornField={(name) => (name === "name" ? <span>adorned</span> : null)}
      />,
    );

    await expect.element(page.getByText("adorned")).toBeInTheDocument();
    await expect
      .element(page.getByRole("textbox", { name: "Sample name", exact: true }))
      .toBeInTheDocument();
  });

  it.each([
    {
      case: "a field its rule does not adorn",
      adornField: (name: string) =>
        name === "other" ? <span>adorned</span> : null,
    },
    { case: "no provider", adornField: undefined },
  ])("should render no adornment for $case", async ({ adornField }) => {
    await render(<Harness adornField={adornField} />);

    await expect
      .element(page.getByRole("textbox", { name: "Sample name", exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByText("adorned")).not.toBeInTheDocument();
  });
});
