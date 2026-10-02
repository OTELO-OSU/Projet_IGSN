import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { useAppForm } from "./app-form.tsx";
import { FieldRequiredProvider } from "./field-required-context.tsx";

function Harness({
  isFieldRequired,
  requiredToPublish,
}: {
  isFieldRequired?: (name: string) => boolean;
  requiredToPublish?: boolean;
}) {
  const form = useAppForm({ defaultValues: { name: "" } });
  const field = (
    <form>
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            label="Sample name"
            requiredToPublish={requiredToPublish}
          />
        )}
      </form.AppField>
    </form>
  );
  if (!isFieldRequired) return field;
  return (
    <FieldRequiredProvider value={isFieldRequired}>
      {field}
    </FieldRequiredProvider>
  );
}

describe("FieldRequiredProvider", () => {
  it.each([
    {
      case: "mark a field its rule requires despite requiredToPublish={false}",
      isFieldRequired: (name: string) => name === "name",
      requiredToPublish: false,
      label: "Sample name *",
    },
    {
      case: "unmark a field its rule does not require despite requiredToPublish",
      isFieldRequired: () => false,
      requiredToPublish: true,
      label: "Sample name",
    },
    {
      case: "let requiredToPublish decide without a provider",
      isFieldRequired: undefined,
      requiredToPublish: true,
      label: "Sample name *",
    },
  ])("should $case", async ({ isFieldRequired, requiredToPublish, label }) => {
    await render(
      <Harness
        isFieldRequired={isFieldRequired}
        requiredToPublish={requiredToPublish}
      />,
    );

    await expect
      .element(page.getByLabelText(label, { exact: true }))
      .toBeInTheDocument();
  });
});
