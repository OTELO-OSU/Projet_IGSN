import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";
import { FieldDisabledProvider } from "./field-disabled-context.tsx";

function Harness({
  onSubmit = () => {},
}: {
  onSubmit?: (value: boolean) => void;
}) {
  const form = useAppForm({
    defaultValues: { oriented: false },
    onSubmit: ({ value }) => onSubmit(value.oriented),
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="oriented">
        {(field) => <field.SwitchField label="Oriented sample" />}
      </form.AppField>
      <button type="submit">Save</button>
    </form>
  );
}

describe("SwitchField", () => {
  it("should store the toggled state as a boolean", async () => {
    const onSubmit = vi.fn();
    await render(<Harness onSubmit={onSubmit} />);

    const control = page.getByRole("switch", { name: "Oriented sample" });
    await expect.element(control).not.toBeChecked();
    await control.click();

    await expect.element(control).toBeChecked();
    await page.getByRole("button", { name: "Save" }).click();
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledWith(true));
  });

  it("should render a non-interactive switch when the form marks the field disabled", async () => {
    await render(
      <FieldDisabledProvider value={() => true}>
        <Harness />
      </FieldDisabledProvider>,
    );

    await expect
      .element(page.getByRole("switch", { name: "Oriented sample" }))
      .toBeDisabled();
  });
});
