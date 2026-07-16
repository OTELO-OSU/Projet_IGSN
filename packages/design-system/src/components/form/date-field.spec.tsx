import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

function Harness({ label }: { label: string }) {
  const form = useAppForm({
    defaultValues: { collected: null as string | null | undefined },
  });
  return (
    <form>
      <form.AppField
        name="collected"
        validators={{
          onChange: ({ value }: { value: string | null | undefined }) =>
            value === "2026-01-01" ? { message: "Too early" } : undefined,
        }}
      >
        {(field) => <field.DateField label={label} />}
      </form.AppField>
    </form>
  );
}

describe("DateField", () => {
  it("should render a nullish value as an empty date input", async () => {
    await render(<Harness label="Collection date" />);

    const input = page.getByLabelText("Collection date");
    await expect.element(input).toHaveValue("");
    expect(input.element().getAttribute("type")).toBe("date");
  });

  it("should store the picked date as an ISO string", async () => {
    await render(<Harness label="Collection date" />);

    const input = page.getByLabelText("Collection date");
    await input.fill("2014-10-24");

    await expect.element(input).toHaveValue("2014-10-24");
  });

  it("should read a cleared date as undefined, announcing no error state", async () => {
    await render(<Harness label="Collection date" />);

    const input = page.getByLabelText("Collection date");
    await input.fill("2014-10-24");
    await input.fill("");

    await expect.element(input).toHaveValue("");
    expect(input.element().getAttribute("aria-invalid")).toBeNull();
  });

  it("should announce an accessible error when the field is invalid", async () => {
    await render(<Harness label="Collection date" />);

    const input = page.getByLabelText("Collection date");
    await input.fill("2026-01-01");

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Too early");
    await expect.element(input).toHaveAttribute("aria-invalid", "true");
  });
});
