import { render } from "vitest-browser-react";

import { FieldPicker } from "./field-picker.tsx";

const fields = [
  { key: "igsn", label: "IGSN", section: "Sample", locked: true },
  { key: "locality", label: "Locality", section: "Location", locked: false },
  {
    key: "method",
    label: "Collection method",
    section: "Sample",
    locked: false,
  },
];

const renderPicker = async (selected: string[]) => {
  const onSelectedChange = vi.fn();
  const screen = await render(
    <FieldPicker
      fields={fields}
      selected={selected}
      onSelectedChange={onSelectedChange}
      triggerLabel="Add field"
      legend="Fields shown"
    />,
  );
  await screen.getByRole("button", { name: "Add field" }).click();
  return { screen, onSelectedChange };
};

describe("FieldPicker", () => {
  it("should list every field of a section under that section, wherever it sits in the list", async () => {
    const { screen } = await renderPicker([]);

    const section = screen.getByRole("group", { name: "Sample" });
    await expect
      .element(section.getByRole("checkbox", { name: "IGSN" }))
      .toBeVisible();
    await expect
      .element(section.getByRole("checkbox", { name: "Collection method" }))
      .toBeVisible();
  });

  it("should show a locked field as checked and not togglable", async () => {
    const { screen } = await renderPicker([]);

    const locked = screen.getByRole("checkbox", { name: /IGSN/ });
    await expect.element(locked).toBeChecked();
    await expect.element(locked).toBeDisabled();
  });

  it.each([
    [["method"], "Locality", ["method", "locality"]],
    [["method", "locality"], "Locality", ["method"]],
  ])("should report %o toggled by %s as %o", async (selected, label, next) => {
    const { screen, onSelectedChange } = await renderPicker(selected);

    await screen.getByRole("checkbox", { name: label }).click();

    expect(onSelectedChange).toHaveBeenCalledWith(next);
  });
});
