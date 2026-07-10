import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

function Harness({ label }: { label: string }) {
  const form = useAppForm({ defaultValues: { description: "" } });
  return (
    <form>
      <form.AppField
        name="description"
        validators={{
          onChange: ({ value }: { value: string }) =>
            value ? undefined : { message: "Description is required" },
        }}
      >
        {(field) => <field.TextareaField label={label} />}
      </form.AppField>
    </form>
  );
}

describe("TextareaField", () => {
  it("should render a textarea associated with its label", async () => {
    await render(<Harness label="Description" />);

    const textarea = page.getByLabelText("Description");
    await textarea.fill("A fine-grained basalt sample");

    await expect.element(textarea).toHaveValue("A fine-grained basalt sample");
  });

  it("should announce an accessible error when the field is invalid", async () => {
    await render(<Harness label="Description" />);

    const textarea = page.getByLabelText("Description");
    await textarea.fill("A fine-grained basalt sample");
    await textarea.fill("");

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Description is required");
    await expect.element(textarea).toHaveAttribute("aria-invalid", "true");
  });
});
