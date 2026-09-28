import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

function Harness({
  label,
  multiline,
  disabled,
  requiredToPublish,
  hint,
}: {
  label: string;
  multiline?: boolean;
  disabled?: boolean;
  requiredToPublish?: boolean;
  hint?: string;
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
            hint={hint}
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

function RevealHarness({
  description,
  canReveal,
}: {
  description: string;
  canReveal: boolean;
}) {
  const form = useAppForm({ defaultValues: { description } });
  return (
    <form>
      <form.AppField name="description">
        {(field) => (
          <field.TextField
            label="Description"
            multiline
            reveal={{ label: "Add a description", canReveal }}
          />
        )}
      </form.AppField>
    </form>
  );
}

describe("TextField reveal", () => {
  it("should render neither the link nor the field when an empty field cannot be revealed", async () => {
    await render(<RevealHarness description="" canReveal={false} />);

    await expect
      .element(page.getByRole("button", { name: "Add a description" }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByLabelText("Description"))
      .not.toBeInTheDocument();
  });

  it("should show and focus the field when its reveal link is clicked", async () => {
    await render(<RevealHarness description="" canReveal />);

    await page.getByRole("button", { name: "Add a description" }).click();

    await expect.element(page.getByLabelText("Description")).toHaveFocus();
    await expect
      .element(page.getByRole("button", { name: "Add a description" }))
      .not.toBeInTheDocument();
  });

  it("should show a filled field without the reveal link", async () => {
    await render(<RevealHarness description="Basalt" canReveal />);

    await expect
      .element(page.getByLabelText("Description"))
      .toHaveValue("Basalt");
    await expect
      .element(page.getByRole("button", { name: "Add a description" }))
      .not.toBeInTheDocument();
  });

  it("should keep a shown field while the user empties it", async () => {
    await render(<RevealHarness description="Basalt" canReveal />);

    await page.getByLabelText("Description").fill("");

    await expect.element(page.getByLabelText("Description")).toHaveValue("");
  });
});

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

  it("should show a hint and describe the input by it alone", async () => {
    await render(<Harness label="Sample name" hint="Up to 200 characters." />);

    await expect.element(page.getByText("Up to 200 characters.")).toBeVisible();
    await expect
      .element(page.getByLabelText("Sample name"))
      .toHaveAttribute("aria-describedby", "name-hint");
  });

  it("should replace the hint with the error once invalid", async () => {
    await render(<Harness label="Sample name" hint="Up to 200 characters." />);

    const input = page.getByLabelText("Sample name");
    await input.fill("Basalt 42");
    await input.fill("");

    await expect
      .element(input)
      .toHaveAttribute("aria-describedby", "name-error");
    await expect
      .element(page.getByRole("alert"))
      .toHaveTextContent("Name is required");
    await expect
      .element(page.getByText("Up to 200 characters."))
      .not.toBeInTheDocument();
  });

  it("should render no hint element and describe by the error alone without a hint", async () => {
    await render(<Harness label="Sample name" />);

    const input = page.getByLabelText("Sample name");
    expect(document.getElementById("name-hint")).toBeNull();
    await expect.element(input).not.toHaveAttribute("aria-describedby");

    await input.fill("Basalt 42");
    await input.fill("");

    await expect
      .element(input)
      .toHaveAttribute("aria-describedby", "name-error");
  });
});
