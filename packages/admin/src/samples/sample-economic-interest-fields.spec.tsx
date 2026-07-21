import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";
import { render } from "vitest-browser-react";

import { SampleForm } from "./sample-form.tsx";

const noop = () => {};

const createAction = (onSubmit: (value: CreateSample) => void) =>
  ({ kind: "submit", label: "Create", onSubmit }) as const;

// Renders the form with the required fields prefilled and opens the Physical
// description tab, so each test only drives the economic interest inputs.
async function renderEconomicSection(
  onSubmit: (value: CreateSample) => void = noop,
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
      }}
      primaryAction={createAction(onSubmit)}
    />,
  );
  await screen.getByRole("tab", { name: "Physical description" }).click();
  return screen;
}

describe("SampleEconomicInterestFields", () => {
  it("should submit the elements and detail chosen for a mineral_and_ore resource", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEconomicSection(onSubmit);

    await screen.getByRole("combobox", { name: "Economic interest" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await screen.getByRole("combobox", { name: "Resource type" }).click();
    await screen
      .getByRole("option", { name: "Mineral and Ore Resources" })
      .click();
    await screen
      .getByRole("combobox", { name: "Chemical elements of interest" })
      .click();
    await screen.getByPlaceholder("Search...").fill("Iron");
    await screen.getByRole("option", { name: "Iron" }).click();
    await screen.getByLabelText("Deposit name").fill("Cigar Lake");
    await screen.getByRole("button", { name: "Create" }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          economicInterest: "yes.mineral_and_ore",
          economicInterestElements: ["fe"],
          economicDepositName: "Cigar Lake",
        }),
      ),
    );
  });

  it("should disable the deposit fields until the answer is yes", async () => {
    const screen = await renderEconomicSection();

    await expect.element(screen.getByLabelText("Deposit name")).toBeDisabled();

    await screen.getByRole("combobox", { name: "Economic interest" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();

    await expect
      .element(screen.getByLabelText("Deposit name"))
      .not.toBeDisabled();
  });

  it("should reveal the chemical elements only for a mineral_and_ore resource", async () => {
    const screen = await renderEconomicSection();

    await screen.getByRole("combobox", { name: "Economic interest" }).click();
    await screen.getByRole("option", { name: "Yes" }).click();
    await screen.getByRole("combobox", { name: "Resource type" }).click();
    await screen.getByRole("option", { name: "Hydrocarbon Resources" }).click();

    await expect
      .element(
        screen.getByRole("combobox", { name: "Chemical elements of interest" }),
      )
      .not.toBeInTheDocument();
  });
});
