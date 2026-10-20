import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { RowSelectionState } from "@tanstack/react-table";

import { useState } from "react";
import { vi } from "vitest";
import { page } from "vitest/browser";

import { SEARCH_CSV_EXPORT_LIMIT } from "#/search-export-limit.ts";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { SearchResultsView } from "./search-results-view.tsx";

const sample = {
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  name: "Basalt 42",
  material: "rock_and_sediment.rock.igneous",
} as unknown as Sample;

type ViewProps = Parameters<typeof SearchResultsView>[0];

type GivenProps = Omit<
  ViewProps,
  "onFieldsChange" | "selection" | "onSelectionChange"
> &
  Partial<ViewProps>;

function renderView(given: GivenProps) {
  const props: ViewProps = {
    onFieldsChange: vi.fn(),
    selection: {},
    onSelectionChange: vi.fn(),
    ...given,
  };
  return renderWithRouter(<SearchResultsView {...props} />, ["/samples/$igsn"]);
}

const onePage = {
  samples: [sample],
  total: 1,
  page: 1,
  pageCount: 1,
  emptyMessage: "No samples match your search.",
  perPage: 50,
  onPageChange: vi.fn(),
  onPerPageChange: vi.fn(),
};

function SelectableView() {
  const [selection, setSelection] = useState<RowSelectionState>({});
  return (
    <SearchResultsView
      {...onePage}
      onFieldsChange={vi.fn()}
      selection={selection}
      onSelectionChange={setSelection}
    />
  );
}

describe("SearchResultsView", () => {
  beforeEach(async () => {
    localStorage.clear();
    await page.viewport(1280, 800);
  });

  it("should highlight a search match in the table beside the hidden phone cards", async () => {
    await renderView({ ...onePage, query: "basalt" });
    await page.getByRole("radio", { name: "Table view" }).click();
    const table = page.getByRole("table");

    await expect
      .poll(() =>
        [...(CSS.highlights.get("sample-search-match") ?? [])]
          .filter((range) => table.element().contains(range.startContainer))
          .map(String),
      )
      .toEqual(["Basalt"]);
  });

  it("should switch the cards to a table and keep that view after a remount", async () => {
    const first = await renderView(onePage);
    await page.getByRole("radio", { name: "Table view" }).click();
    await expect.element(page.getByRole("table")).toBeVisible();
    await first.unmount();

    await renderView(onePage);

    await expect
      .element(page.getByRole("radio", { name: "Table view" }))
      .toBeChecked();
    await expect.element(page.getByRole("table")).toBeVisible();
  });

  it("should count the checked samples and clear them", async () => {
    await renderWithRouter(<SelectableView />, ["/samples/$igsn"]);
    await page.getByRole("radio", { name: "Table view" }).click();
    const row = page.getByRole("checkbox", { name: "Select Basalt 42" });

    await row.click();
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent("1 selected");
    await page.getByRole("button", { name: "Clear" }).click();

    await expect.element(row).not.toBeChecked();
    await expect.element(page.getByRole("status")).toHaveTextContent("");
  });

  it("should say the maximum is reached once the cap is checked, in the card view too", async () => {
    await renderView({
      ...onePage,
      selection: Object.fromEntries(
        Array.from({ length: SEARCH_CSV_EXPORT_LIMIT }, (_, index) => [
          `IGSN${index}`,
          true,
        ]),
      ),
    });

    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(
        `${SEARCH_CSV_EXPORT_LIMIT} selected (maximum reached)`,
      );
  });

  it("should list the matching samples with a singular count on a single match", async () => {
    const screen = await renderView({
      samples: [sample],
      total: 1,
      page: 1,
      pageCount: 1,
      emptyMessage: "No samples match your search.",
      perPage: 50,
      onPageChange: vi.fn(),
      onPerPageChange: vi.fn(),
    });

    await expect
      .element(screen.getByText("1 result", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: /Basalt 42/ }))
      .toBeInTheDocument();
  });

  it("should keep the plural count on several matches", async () => {
    const screen = await renderView({
      samples: [sample],
      total: 3,
      page: 1,
      pageCount: 1,
      emptyMessage: "No samples match your search.",
      perPage: 50,
      onPageChange: vi.fn(),
      onPerPageChange: vi.fn(),
    });

    await expect.element(screen.getByText("3 results")).toBeInTheDocument();
  });

  it("should show the empty message on zero matches, not the list", async () => {
    const screen = await renderView({
      samples: [],
      total: 0,
      page: 1,
      pageCount: 1,
      emptyMessage: "No published samples in the selected area.",
      perPage: 50,
      onPageChange: vi.fn(),
      onPerPageChange: vi.fn(),
    });

    await expect
      .element(screen.getByRole("status"))
      .toHaveTextContent("No published samples in the selected area.");
    expect(screen.getByText("0 results").query()).toBeNull();
  });

  it("should offer the page sizes with the current one selected", async () => {
    const screen = await renderView({
      samples: [sample],
      total: 60,
      page: 1,
      pageCount: 2,
      emptyMessage: "No samples match your search.",
      perPage: 50,
      onPageChange: vi.fn(),
      onPerPageChange: vi.fn(),
    });

    await expect.element(screen.getByText("Results per page")).toBeVisible();
    const select = screen.getByRole("combobox", { name: "Results per page" });
    await expect.element(select).toHaveTextContent("50");
    await select.click();
    for (const size of ["10", "25", "50"]) {
      await expect
        .element(page.getByRole("option", { name: size }))
        .toBeInTheDocument();
    }
  });

  it.each([
    ["picks a field", [], ["collectionMethod"]],
    ["unpicks a field", ["collectionMethod"], []],
  ])(
    "should report the card fields when the reader %s",
    async (_case, fields, expected) => {
      const onFieldsChange = vi.fn();
      const screen = await renderView({
        samples: [sample],
        total: 1,
        page: 1,
        pageCount: 1,
        emptyMessage: "No samples match your search.",
        perPage: 50,
        fields,
        onPageChange: vi.fn(),
        onPerPageChange: vi.fn(),
        onFieldsChange,
      });

      await screen.getByRole("button", { name: "Add field results" }).click();
      await page.getByRole("checkbox", { name: "Collection method" }).click();

      expect(onFieldsChange).toHaveBeenCalledWith(expected);
    },
  );

  it("should lock the fields every card shows", async () => {
    const screen = await renderView({
      samples: [sample],
      total: 1,
      page: 1,
      pageCount: 1,
      emptyMessage: "No samples match your search.",
      perPage: 50,
      onPageChange: vi.fn(),
      onPerPageChange: vi.fn(),
    });

    await screen.getByRole("button", { name: "Add field results" }).click();

    const locked = page.getByRole("checkbox", { name: "Sample name *" });
    await expect.element(locked).toBeChecked();
    await expect.element(locked).toBeDisabled();
  });

  it("should report the page size the reader picks", async () => {
    const onPerPageChange = vi.fn();
    const screen = await renderView({
      samples: [sample],
      total: 60,
      page: 3,
      pageCount: 2,
      emptyMessage: "No samples match your search.",
      perPage: 50,
      onPageChange: vi.fn(),
      onPerPageChange,
    });

    await screen.getByRole("combobox", { name: "Results per page" }).click();
    await page.getByRole("option", { name: "25" }).click();

    expect(onPerPageChange).toHaveBeenCalledWith(25);
  });
});
