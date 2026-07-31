import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";
import { FieldDisabledProvider } from "./field-disabled-context.tsx";

function Harness({
  isFieldDisabled,
  disabled,
}: {
  isFieldDisabled?: (name: string) => boolean;
  disabled?: boolean;
}) {
  const form = useAppForm({ defaultValues: { name: "", nickname: "" } });
  const fields = (
    <form>
      <form.AppField name="name">
        {(field) => <field.TextField label="Sample name" disabled={disabled} />}
      </form.AppField>
      <form.AppField name="nickname">
        {(field) => <field.TextField label="Nickname" />}
      </form.AppField>
    </form>
  );
  if (!isFieldDisabled) return fields;
  return (
    <FieldDisabledProvider value={isFieldDisabled}>
      {fields}
    </FieldDisabledProvider>
  );
}

describe("FieldDisabledProvider", () => {
  it("should disable the control its resolver matches by field name", async () => {
    await render(<Harness isFieldDisabled={(name) => name === "name"} />);

    await expect.element(page.getByLabelText("Sample name")).toBeDisabled();
    await expect.element(page.getByLabelText("Nickname")).toBeEnabled();
  });

  it("should keep a control disabled by its own prop when the resolver says false", async () => {
    await render(<Harness isFieldDisabled={() => false} disabled />);

    await expect.element(page.getByLabelText("Sample name")).toBeDisabled();
  });

  it("should leave every control enabled without a provider", async () => {
    await render(<Harness />);

    await expect.element(page.getByLabelText("Sample name")).toBeEnabled();
    await expect.element(page.getByLabelText("Nickname")).toBeEnabled();
  });
});
