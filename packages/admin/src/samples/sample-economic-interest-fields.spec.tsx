import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { toHierarchyPath } from "@projet-igsn/design-system/components/form/hierarchy-select-field";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import {
  type EconomicInterestDraft,
  toEconomicInterestDraft,
} from "#/samples/compose-economic-interest.ts";
import { SampleEconomicInterestFields } from "#/samples/sample-economic-interest-fields.tsx";
import { SampleForm } from "#/samples/sample-form.tsx";

import { render as renderWithClient } from "../../test/render.tsx";

function Harness({
  material = "sediment",
  values,
}: {
  material?: string | null;
  values?: Partial<EconomicInterestDraft>;
} = {}) {
  const form = useAppForm({
    defaultValues: {
      materialPath: toHierarchyPath(material),
      ...toEconomicInterestDraft(undefined),
      ...values,
    },
    onSubmit: () => {},
  });
  return (
    <form.AppForm>
      <SampleEconomicInterestFields />
    </form.AppForm>
  );
}

const toggle = () =>
  page.getByRole("switch", { name: "Record an economic interest" });
const resourceType = () =>
  page.getByRole("combobox", { name: "Resource type" });
const elements = () =>
  page.getByRole("combobox", { name: "Chemical elements of interest" });

const noop = () => {};

async function renderEconomicTab(
  onSubmit: (value: CreateSample) => void = noop,
) {
  const screen = await renderWithClient(
    <SampleForm
      onCancel={noop}
      defaultValues={{
        name: "Basalte du Massif Central",
        nature: "thin_section",
        type: null,
        material: "sediment",
        collectionMethod: null,
        collectionMethodDescription: null,
      }}
      primaryAction={{ kind: "submit", label: "Create", onSubmit }}
    />,
  );
  await screen.getByRole("tab", { name: "Sample classification" }).click();
  return screen;
}

describe("SampleEconomicInterestFields", () => {
  it("should render nothing for a material with no economic interest", async () => {
    await render(<Harness material="mineral" />);

    await expect.element(toggle()).not.toBeInTheDocument();
    await expect
      .element(page.getByRole("heading", { name: "Economic interest" }))
      .not.toBeInTheDocument();
  });

  it("should offer the switch off by default for an eligible material", async () => {
    await render(<Harness />);

    await expect.element(toggle()).not.toBeChecked();
    await expect.element(resourceType()).not.toBeInTheDocument();
  });

  it("should reveal the resource type and the detail fields once enabled", async () => {
    await render(<Harness />);

    await toggle().click();

    await expect.element(resourceType()).toBeInTheDocument();
    await expect
      .element(page.getByLabelText("Resource type details"))
      .toBeVisible();
    await expect.element(page.getByLabelText("Deposit name")).toBeVisible();
    await expect
      .element(page.getByLabelText("Deposit description"))
      .toBeVisible();
  });

  it("should clear what was entered when disabled and re-enabled", async () => {
    await render(<Harness />);

    await toggle().click();
    await page.getByLabelText("Deposit name").fill("Cigar Lake");
    await toggle().click();
    await toggle().click();

    await expect.element(page.getByLabelText("Deposit name")).toHaveValue("");
  });

  it("should start enabled when the draft already carries a detail", async () => {
    await render(<Harness values={{ economicDepositName: "Grande Mine" }} />);

    await expect.element(toggle()).toBeChecked();
    await expect
      .element(page.getByLabelText("Deposit name"))
      .toHaveValue("Grande Mine");
  });

  it("should reveal the chemical elements only under mineral_and_ore", async () => {
    await render(<Harness />);

    await toggle().click();
    await resourceType().click();
    await page.getByRole("option", { name: "Hydrocarbon Resources" }).click();

    await expect.element(elements()).not.toBeInTheDocument();

    await resourceType().click();
    await page
      .getByRole("option", { name: "Mineral and Ore Resources" })
      .click();

    await expect.element(elements()).toBeInTheDocument();
  });

  it("should submit the elements and detail chosen for a mineral_and_ore resource", async () => {
    const onSubmit = vi.fn();
    const screen = await renderEconomicTab(onSubmit);

    await toggle().click();
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
          resourceType: "mineral_and_ore",
          economicInterestElements: ["fe"],
          economicDepositName: "Cigar Lake",
        }),
      ),
    );
  });
});
