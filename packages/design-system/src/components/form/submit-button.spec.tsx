import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";

function Harness({ disabled }: { disabled?: boolean }) {
  const form = useAppForm({ defaultValues: {} });
  return (
    <form.AppForm>
      <form.SubmitButton label="Publish" disabled={disabled} />
    </form.AppForm>
  );
}

describe("SubmitButton", () => {
  it("should render a submit button with its label", async () => {
    await render(<Harness />);

    const button = page.getByRole("button", { name: "Publish" });

    await expect.element(button).toBeEnabled();
    await expect.element(button).toHaveAttribute("type", "submit");
  });

  it("should be disabled when the disabled prop is set", async () => {
    await render(<Harness disabled />);

    await expect
      .element(page.getByRole("button", { name: "Publish" }))
      .toBeDisabled();
  });
});
