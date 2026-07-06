import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

describe("SampleForm", () => {
  it("should reject a blank name and not submit", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onSubmit={onSubmit} onCancel={noop} submitLabel="Create" />,
    );

    await screen.getByRole("button", { name: "Create" }).click();

    await expect.element(screen.getByText("Name is required")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should submit the entered name and selected nature", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm onSubmit={onSubmit} onCancel={noop} submitLabel="Create" />,
    );

    await screen.getByLabelText(/name/i).fill("Basalte du Massif Central");
    await screen.getByRole("combobox").click();
    await screen.getByText("Thin section").click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Basalte du Massif Central",
        nature: "thin_section",
      }),
    );
  });

  it("should prefill the fields and use the given submit label", async () => {
    const onSubmit = vi.fn();
    const screen = await render(
      <SampleForm
        onSubmit={onSubmit}
        onCancel={noop}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
        }}
        submitLabel="Save"
      />,
    );

    await expect
      .element(screen.getByLabelText(/name/i))
      .toHaveValue("Basalte du Massif Central");

    await screen.getByRole("button", { name: "Save" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Basalte du Massif Central",
        nature: "thin_section",
      }),
    );
  });

  it("should call onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    const screen = await render(
      <SampleForm onSubmit={noop} onCancel={onCancel} submitLabel="Create" />,
    );

    await screen.getByRole("button", { name: "Cancel" }).click();

    expect(onCancel).toHaveBeenCalled();
  });

  it("should report value changes as the user edits", async () => {
    const onValuesChange = vi.fn();
    const screen = await render(
      <SampleForm
        onSubmit={noop}
        onCancel={noop}
        onValuesChange={onValuesChange}
        defaultValues={{
          name: "Basalte du Massif Central",
          nature: "thin_section",
        }}
        submitLabel="Save"
      />,
    );

    await screen.getByLabelText(/name/i).fill("Grès de Fontainebleau");

    await vi.waitFor(() =>
      expect(onValuesChange).toHaveBeenLastCalledWith({
        name: "Grès de Fontainebleau",
        nature: "thin_section",
      }),
    );
  });
});
