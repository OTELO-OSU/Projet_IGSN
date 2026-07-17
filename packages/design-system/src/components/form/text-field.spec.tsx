import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

function Harness({
  label,
  multiline,
  disabled,
  requiredToPublish,
}: {
  label: string;
  multiline?: boolean;
  disabled?: boolean;
  requiredToPublish?: boolean;
}) {
  const form = useAppForm({ defaultValues: { name: "" } });
  return (
    <form>
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }: { value: string }) =>
            value ? undefined : { message: "Name is required" },
        }}
      >
        {(field) => (
          <field.TextField
            label={label}
            multiline={multiline}
            disabled={disabled}
            requiredToPublish={requiredToPublish}
          />
        )}
      </form.AppField>
    </form>
  );
}

function NullishHarness() {
  const form = useAppForm({ defaultValues: { name: null as string | null } });
  return (
    <form>
      <form.AppField name="name">
        {(field) => <field.TextField label="Sample name" />}
      </form.AppField>
    </form>
  );
}

describe("TextField", () => {
  it("should render a nullish value as an empty input", async () => {
    await render(<NullishHarness />);

    await expect.element(page.getByLabelText("Sample name")).toHaveValue("");
  });

  it("should render an input associated with its label", async () => {
    await render(<Harness label="Sample name" />);

    const input = page.getByLabelText("Sample name");
    await input.fill("Basalt 42");

    await expect.element(input).toHaveValue("Basalt 42");
  });

  it("should mark the label with a trailing * when requiredToPublish", async () => {
    await render(<Harness label="Sample name" requiredToPublish />);

    await expect.element(page.getByLabelText("Sample name *")).toBeVisible();
  });

  it("should render a labelled textarea when multiline", async () => {
    await render(<Harness label="Description" multiline />);

    const textarea = page.getByLabelText("Description");
    await textarea.fill("A fine-grained basalt sample");

    await expect.element(textarea).toHaveValue("A fine-grained basalt sample");
    expect(textarea.element().tagName).toBe("TEXTAREA");
  });

  it("should render a disabled input when disabled", async () => {
    await render(<Harness label="Sample name" disabled />);

    await expect.element(page.getByLabelText("Sample name")).toBeDisabled();
  });

  it("should announce an accessible error when the field is invalid", async () => {
    await render(<Harness label="Sample name" />);

    const input = page.getByLabelText("Sample name");
    await input.fill("Basalt 42");
    await input.fill("");

    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Name is required");
    await expect.element(input).toHaveAttribute("aria-invalid", "true");
  });
});
