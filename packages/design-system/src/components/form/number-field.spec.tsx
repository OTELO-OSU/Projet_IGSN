import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

function Harness({
  label,
  onValue,
}: {
  label: string;
  onValue?: (value: number | undefined) => void;
}) {
  const form = useAppForm({
    defaultValues: { longitude: undefined as number | undefined },
    listeners: {
      onChange: ({ formApi }) => onValue?.(formApi.state.values.longitude),
    },
  });
  return (
    <form>
      <form.AppField
        name="longitude"
        validators={{
          onChange: ({ value }: { value: number | undefined }) =>
            value !== undefined && value > 180
              ? { message: "Longitude is out of range" }
              : undefined,
        }}
      >
        {(field) => <field.NumberField label={label} />}
      </form.AppField>
    </form>
  );
}

describe("NumberField", () => {
  it("should store the typed decimal as a number", async () => {
    const values: Array<number | undefined> = [];
    await render(<Harness label="Longitude" onValue={(v) => values.push(v)} />);

    const input = page.getByLabelText("Longitude");
    await input.fill("-12.5");

    await expect.element(input).toHaveValue(-12.5);
    await expect.element(input).toHaveAttribute("type", "number");
    expect(values.at(-1)).toBe(-12.5);
  });

  it("should store undefined when cleared", async () => {
    const values: Array<number | undefined> = [];
    await render(<Harness label="Longitude" onValue={(v) => values.push(v)} />);

    const input = page.getByLabelText("Longitude");
    await input.fill("3");
    await input.fill("");

    await expect.element(input).toHaveValue(null);
    expect(values.at(-1)).toBeUndefined();
  });

  it("should announce an accessible error when the field is invalid", async () => {
    await render(<Harness label="Longitude" />);

    const input = page.getByLabelText("Longitude");
    await input.fill("200");

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Longitude is out of range");
    await expect.element(input).toHaveAttribute("aria-invalid", "true");
  });
});
