import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";

import { render } from "../../test/render.tsx";
import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

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
  await screen.getByRole("tab", { name: "Conservation and security" }).click();
  return screen;
}

describe("SampleSecurityFields", () => {
  it("should submit a declared hazard with its explanation", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSecuritySection(onSubmit);

    await screen.getByRole("switch", { name: "Radioactivity" }).click();
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
            asbestosRich: false,
            chemicalRisk: false,
          },
        }),
      ),
    );
  });

  it("should show the explanation only once the hazard is switched on", async () => {
    const screen = await renderSecuritySection();

    await expect
      .element(screen.getByLabelText("Asbestos explanation"))
      .not.toBeInTheDocument();

    await screen.getByRole("switch", { name: "Asbestos-rich" }).click();

    await expect
      .element(screen.getByLabelText("Asbestos explanation"))
      .toBeVisible();

    await screen.getByRole("switch", { name: "Asbestos-rich" }).click();

    await expect
      .element(screen.getByLabelText("Asbestos explanation"))
      .not.toBeInTheDocument();
  });

  it("should drop an explanation left behind when the hazard is switched off", async () => {
    const onSubmit = vi.fn();
    const screen = await renderSecuritySection(onSubmit, {
      chemicalRisk: true,
      chemicalRiskExplanation: "toxic metals",
    });

    await expect
      .element(screen.getByRole("switch", { name: "Chemical risk" }))
      .toBeChecked();
    await screen.getByRole("switch", { name: "Chemical risk" }).click();
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          security: {
            radioactivity: false,
            asbestosRich: false,
            chemicalRisk: false,
          },
        }),
      ),
    );
  });
});
