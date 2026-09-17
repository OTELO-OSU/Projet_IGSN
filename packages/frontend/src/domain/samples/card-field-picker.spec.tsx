import { render } from "vitest-browser-react";

import { CardFieldPicker } from "./card-field-picker.tsx";

describe("CardFieldPicker", () => {
  it("should list every field of a section under that section, wherever it sits in the registry", async () => {
    const screen = await render(<CardFieldPicker onFieldsChange={vi.fn()} />);

    await screen.getByRole("button", { name: /add field/i }).click();

    const section = screen.getByRole("group", { name: "Sample" });
    await expect
      .element(section.getByRole("checkbox", { name: "IGSN" }))
      .toBeVisible();
    await expect
      .element(section.getByRole("checkbox", { name: "Collection method" }))
      .toBeVisible();
  });
});
