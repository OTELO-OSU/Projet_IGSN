import type { Sample } from "@projet-igsn/domain/sample/sample";

import { vi } from "vitest";
import { page } from "vitest/browser";

import { renderWithRouter } from "../../../test/render-with-router.tsx";
import { SearchResultsView } from "./search-results-view.tsx";

const sample = {
  igsn: "0123456789ABCDEFGHJKMNPQRS",
  name: "Basalt 42",
  material: "rock.igneous",
} as unknown as Sample;

type ViewProps = Parameters<typeof SearchResultsView>[0];

function renderView(
  given: Omit<ViewProps, "onFieldsChange"> & Partial<ViewProps>,
) {
  const props: ViewProps = { onFieldsChange: vi.fn(), ...given };
  return renderWithRouter(<SearchResultsView {...props} />, ["/samples/$igsn"]);
}

describe("SearchResultsView", () => {
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
    ["picks a field", [], ["texture"]],
    ["unpicks a field", ["texture"], []],
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
      await page.getByRole("checkbox", { name: "Texture" }).click();

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
