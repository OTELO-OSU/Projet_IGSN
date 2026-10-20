import type { PublicListedSample } from "@projet-igsn/domain/sample/sample-validator";
import type { RowSelectionState } from "@tanstack/react-table";

import { useState } from "react";
import { page } from "vitest/browser";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { SampleTable } from "./sample-table.tsx";

const basalt = {
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  name: "Basalt 42",
  internalNumber: 7,
} as unknown as PublicListedSample;

const granite = {
  igsn: "ABCDEFGHJKMNPQRS0123456789",
  name: "Granite 7",
  internalNumber: 8,
} as unknown as PublicListedSample;

function Harness({
  fields = [],
  maxSelected = 10,
}: {
  fields?: string[];
  maxSelected?: number;
}) {
  const [selection, setSelection] = useState<RowSelectionState>({});
  return (
    <SampleTable
      samples={[basalt, granite]}
      fields={fields}
      selection={selection}
      onSelectionChange={setSelection}
      maxSelected={maxSelected}
    />
  );
}

const renderTable = (props: Parameters<typeof Harness>[0] = {}) =>
  renderWithRouter(<Harness {...props} />, ["/samples/$igsn"]);

const pageCheckbox = () =>
  page.getByRole("checkbox", { name: "Select all on this page" });

describe("SampleTable", () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it("should head the card's columns, the internal ID and the picked fields", async () => {
    await renderTable({ fields: ["internalNumber", "collectionMethod"] });

    await expect.element(pageCheckbox()).toBeVisible();
    expect(
      page
        .getByRole("columnheader")
        .elements()
        .map((header) => header.textContent),
    ).toEqual([
      "",
      "Sample name",
      "IGSN",
      "Internal ID",
      "Type and nature",
      "Material",
      "Country and locality",
      "Collector name",
      "Collection method",
    ]);
  });

  it("should link the sample name to its page", async () => {
    await renderTable();

    await expect
      .element(page.getByRole("link", { name: "Basalt 42" }))
      .toHaveAttribute("href", `/samples/${basalt.igsn}`);
  });

  it("should check a row through the checkbox labelled by its sample name", async () => {
    await renderTable();
    const row = page.getByRole("checkbox", { name: "Select Basalt 42" });

    await row.click();

    await expect.element(row).toBeChecked();
  });

  it("should show the page checkbox partly checked, then check the whole page", async () => {
    await renderTable();
    await page.getByRole("checkbox", { name: "Select Basalt 42" }).click();

    await expect.element(pageCheckbox()).toBePartiallyChecked();
    await pageCheckbox().click();

    await expect
      .element(page.getByRole("checkbox", { name: "Select Granite 7" }))
      .toBeChecked();
  });

  it("should disable the unchecked rows and the page checkbox once the cap is reached", async () => {
    await renderTable({ maxSelected: 1 });

    await page.getByRole("checkbox", { name: "Select Basalt 42" }).click();

    await expect
      .element(page.getByRole("checkbox", { name: "Select Granite 7" }))
      .toBeDisabled();
    await expect.element(pageCheckbox()).toBeDisabled();
  });
});
