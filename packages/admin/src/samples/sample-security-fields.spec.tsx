import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

// Renders the form with the required fields prefilled and opens the Physical
// description tab, so each test only drives the security inputs.
async function renderSecuritySection(
  onSubmit: (value: CreateSample) => void = noop,
  security?: CreateSample["security"],
) {
  const screen = await render(
    <SampleForm
      onCancel={noop}
      defaultValues={{
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: null,
        collectionMethod: null,
        collectionMethodDescription: null,
        security,
      }}
      primaryAction={createAction(onSubmit)}
    />,
  );
  await screen.getByRole("tab", { name: "Physical description" }).click();
  return screen;
}

describe("SampleSecurityFields", () => {
  it("should submit a declared hazard with its explanation", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSecuritySection(onSubmit);

    await screen.getByRole("combobox", { name: "Radioactivity" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await screen
      .getByLabelText("Radioactivity explanation")
      .fill("3.2 kBq alpha");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          security: {
            radioactivity: true,
            radioactivityExplanation: "3.2 kBq alpha",
          },
        }),
      ),
    );
  });

  it("should disable the explanation until the hazard is answered yes", async () => {
    const screen = await renderSecuritySection();

    await expect
      .element(screen.getByLabelText("Asbestos explanation"))
      .toBeDisabled();

    await screen.getByRole("combobox", { name: "Asbestos-rich" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();

    await expect
      .element(screen.getByLabelText("Asbestos explanation"))
      .not.toBeDisabled();
  });

  it("should drop an explanation left behind when the hazard is answered no", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSecuritySection(onSubmit, {
      chemicalRisk: true,
      chemicalRiskExplanation: "toxic metals",
    });

    await screen.getByRole("combobox", { name: "Chemical risk" }).click();
    await screen.getByRole("option", { name: "No" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ security: { chemicalRisk: false } }),
      ),
    );
  });
});
