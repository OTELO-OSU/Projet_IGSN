import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

function Harness({ label }: { label: string }) {
  const form = useAppForm({ defaultValues: { longitude: "" } });
  return (
    <form>
      <form.AppField
        name="longitude"
        validators={{
          onChange: ({ value }: { value: string }) =>
            value ? undefined : { message: "Longitude is required" },
        }}
      >
        {(field) => <field.NumberField label={label} />}
      </form.AppField>
    </form>
  );
}

describe("NumberField", () => {
  it("should render a numeric input associated with its label", async () => {
    await render(<Harness label="Longitude" />);

    const input = page.getByLabelText("Longitude");
    await input.fill("-12.5");

    await expect.element(input).toHaveValue(-12.5);
    await expect.element(input).toHaveAttribute("type", "number");
  });

  it("should announce an accessible error when the field is invalid", async () => {
    await render(<Harness label="Longitude" />);

    const input = page.getByLabelText("Longitude");
    await input.fill("42");
    await input.fill("");

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Longitude is required");
    await expect.element(input).toHaveAttribute("aria-invalid", "true");
  });
});
